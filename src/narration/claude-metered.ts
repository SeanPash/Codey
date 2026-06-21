import { execFile } from "node:child_process";

export interface MeteredResult {
  text: string;
  tokens: number;
}

export function buildMeteredArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku", "--output-format", "json"];
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
export function runClaudeMetered(prompt: string, timeoutMs = 15000): Promise<MeteredResult | null> {
  return new Promise((resolve) => {
    execFile("claude", buildMeteredArgs(prompt), { timeout: timeoutMs, shell: false, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(parseMetered(stdout, prompt));
    });
  });
}
