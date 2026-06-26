import { execFile } from "node:child_process";
import { trimArgs, headlessExecOptions, NARRATOR_SYSTEM_PROMPT } from "./headless-flags.js";
import { costUsd as estimateCostUsd } from "../cost/pricing.js";
import { describeExecError } from "./narrator-log.js";
import type { Usage } from "../types.js";

export interface MeteredResult {
  text: string;
  tokens: number;
  usage: Usage;   // the breakdown, kept for the token display
  costUsd: number; // the CLI's own total_cost_usd, or a rate estimate when it is absent
}

const NO_USAGE: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

// Ask for json output (so we can read real usage) on haiku, then apply the shared context trim so a
// one-sentence narration costs ~4k cached tokens instead of ~27k. See headless-flags.ts.
export function buildMeteredArgs(prompt: string): string[] {
  return [
    "-p", prompt,
    "--model", "haiku",
    "--output-format", "json",
    ...trimArgs(NARRATOR_SYSTEM_PROMPT),
  ];
}

// Rough token estimate when real usage is unavailable. ~4 chars per token is the usual
// English rule of thumb; a budget guard only needs the right ballpark.
function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

export function parseMetered(stdout: string, prompt: string): MeteredResult | null {
  const out = stdout.trim();
  if (!out) return null;
  try {
    const o = JSON.parse(out) as { result?: unknown; usage?: Record<string, number>; total_cost_usd?: number };
    const text = typeof o.result === "string" ? o.result.trim() : "";
    if (!text) return null;
    const u = o.usage ?? {};
    const usage: Usage = {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
    };
    const tokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
    // Prefer the CLI's own reported cost: it reflects the real cache tiers and any pricing the rate
    // table can't see. Fall back to the rate estimate only when the field is missing.
    const costUsd = typeof o.total_cost_usd === "number" ? o.total_cost_usd : estimateCostUsd(usage);
    return { text, tokens: tokens > 0 ? tokens : estimateTokens(prompt + text), usage, costUsd };
  } catch {
    // Older CLI or plain output: take stdout as the reply and estimate the cost. No real usage to
    // report, so the breakdown is empty and this call contributes nothing to the cost estimate.
    return { text: out, tokens: estimateTokens(prompt + out), usage: { ...NO_USAGE }, costUsd: 0 };
  }
}

// Runs the user's own Claude Code headless and reports both the text and the token spend.
// The timeout has to clear a real haiku round trip. Each call is cold (no cache reuse across
// separate processes), and a deep why reasons before answering, so calls land in the 25 to 40
// second band. 45s catches the slow tail instead of dropping it to a timeout (the old 35s budget,
// plus a ~3s stdin wait since removed, was tipping deep calls over and leaving 0 narrations). The
// in-flight guard keeps one slow call from stacking up more, and a late explanation beats none.
export function runClaudeMetered(
  prompt: string, timeoutMs = 45000, onError?: (info: string) => void,
): Promise<MeteredResult | null> {
  return runMetered(buildMeteredArgs(prompt), prompt, timeoutMs, onError);
}

// The shared headless runner: spawn claude with the given args and parse text plus usage. Both live
// narration and the timeline segmenter go through here so every call's cost is captured the same way.
// onError reports why a call produced nothing (a missing binary, a timeout, an empty reply) so the
// otherwise-silent background narrator can leave a breadcrumb instead of just returning null.
export function runMetered(
  args: string[], prompt: string, timeoutMs: number, onError?: (info: string) => void,
): Promise<MeteredResult | null> {
  return new Promise((resolve) => {
    const child = execFile("claude", args, headlessExecOptions(timeoutMs), (err, stdout, stderr) => {
      if (err) {
        onError?.(describeExecError(err, stderr));
        return resolve(null);
      }
      const r = parseMetered(stdout, prompt);
      if (!r) onError?.(describeExecError(null));
      resolve(r);
    });
    // The prompt rides in as an argument, so we send no stdin. execFile leaves the stdin pipe open,
    // and headless claude then waits ~3s for input that never comes before proceeding. Close it now
    // so claude sees EOF immediately: that wait is dead latency on every narration and segmentation.
    child.stdin?.end();
  });
}
