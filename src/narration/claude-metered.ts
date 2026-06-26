import { execFile } from "node:child_process";
import { trimArgs, headlessExecOptions, NARRATOR_SYSTEM_PROMPT } from "./headless-flags.js";
import { costUsd as estimateCostUsd } from "../cost/pricing.js";
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
// The timeout has to clear a real haiku round trip. A two-sentence deep why regularly takes
// 25 to 35 seconds end to end (the model reasons before answering), so a tighter budget would
// drop those narrations and leave the status line stuck on the free deterministic caption. 35s
// catches the slow calls; the in-flight guard in the narrator keeps one slow call from stacking
// up more, and a real explanation a little late beats a generic line on time.
export function runClaudeMetered(prompt: string, timeoutMs = 35000): Promise<MeteredResult | null> {
  return runMetered(buildMeteredArgs(prompt), prompt, timeoutMs);
}

// The shared headless runner: spawn claude with the given args and parse text plus usage. Both live
// narration and the timeline segmenter go through here so every call's cost is captured the same way.
export function runMetered(args: string[], prompt: string, timeoutMs: number): Promise<MeteredResult | null> {
  return new Promise((resolve) => {
    execFile("claude", args, headlessExecOptions(timeoutMs), (err, stdout) => {
      if (err) return resolve(null);
      resolve(parseMetered(stdout, prompt));
    });
  });
}
