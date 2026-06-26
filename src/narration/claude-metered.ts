import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";
import { tmpdir } from "node:os";
import { headlessEnv } from "./claude-spawn.js";

export interface MeteredResult {
  text: string;
  tokens: number;
}

// The trailing flags exist to keep narration cheap and clean. `--setting-sources ""` loads no user
// or project settings, so the superpowers and memory SessionStart hooks never fire: those add
// seconds of latency and used to leak into the reply ("I've loaded the superpowers guidance").
// `--exclude-dynamic-system-prompt-sections` moves the per-machine bits out of the system prompt so
// its cache key stays stable across calls and the ~21k base prompt is read from cache, not rebuilt.
// OAuth is unaffected (auth is read regardless of setting sources), so no API key is needed.
export function buildMeteredArgs(prompt: string): string[] {
  return [
    "-p", prompt,
    "--model", "haiku",
    "--output-format", "json",
    "--setting-sources", "",
    "--exclude-dynamic-system-prompt-sections",
  ];
}

// Run the headless narrator from a neutral directory so the project's own CLAUDE.md/rules.md is not
// auto-discovered into the prompt, and carry CODEY_HEADLESS so any hooks that do run skip capture.
export function meteredExecOptions(timeoutMs: number): ExecFileOptionsWithStringEncoding {
  return { timeout: timeoutMs, shell: false, windowsHide: true, cwd: tmpdir(), env: headlessEnv(), encoding: "utf8" };
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
    const o = JSON.parse(out) as { result?: unknown; usage?: Record<string, number> };
    const text = typeof o.result === "string" ? o.result.trim() : "";
    if (!text) return null;
    const u = o.usage ?? {};
    const tokens =
      (u.input_tokens ?? 0) +
      (u.output_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0);
    return { text, tokens: tokens > 0 ? tokens : estimateTokens(prompt + text) };
  } catch {
    // Older CLI or plain output: take stdout as the reply and estimate the cost.
    return { text: out, tokens: estimateTokens(prompt + out) };
  }
}

// Runs the user's own Claude Code headless and reports both the text and the token spend.
// The timeout has to clear a real haiku round trip. A two-sentence deep why regularly takes
// 25 to 35 seconds end to end (the model reasons before answering), so a tighter budget would
// drop those narrations and leave the status line stuck on the free deterministic caption. 35s
// catches the slow calls; the in-flight guard in the narrator keeps one slow call from stacking
// up more, and a real explanation a little late beats a generic line on time.
export function runClaudeMetered(prompt: string, timeoutMs = 35000): Promise<MeteredResult | null> {
  return new Promise((resolve) => {
    execFile("claude", buildMeteredArgs(prompt), meteredExecOptions(timeoutMs), (err, stdout) => {
      if (err) return resolve(null);
      resolve(parseMetered(stdout, prompt));
    });
  });
}
