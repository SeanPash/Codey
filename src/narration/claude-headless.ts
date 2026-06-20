import { execFile } from "node:child_process";

export function buildClaudeArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku"];
}

// Runs the user's own Claude Code headless. Resolves to trimmed stdout, or null on failure.
export function runClaude(prompt: string, timeoutMs = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("claude", buildClaudeArgs(prompt), { timeout: timeoutMs, shell: false }, (err, stdout) => {
      if (err) return resolve(null);
      const out = stdout.trim();
      resolve(out.length > 0 ? out : null);
    });
  });
}

// Segmentation is a one-shot headless pass; allow a longer budget than live narration.
export function runSegmentation(prompt: string): Promise<string | null> {
  return runClaude(prompt, 30_000);
}
