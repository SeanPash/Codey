import { execFile } from "node:child_process";
import { headlessEnv } from "./claude-spawn.js";

export function buildClaudeArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku"];
}

// Runs the user's own Claude Code headless. Resolves to trimmed stdout, or null on failure.
// CODEY_HEADLESS marks this child so its own hook calls skip capture; otherwise every
// narration pass would record itself as a phantom session.
export function runClaude(prompt: string, timeoutMs = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    const env = headlessEnv();
    execFile("claude", buildClaudeArgs(prompt), { timeout: timeoutMs, shell: false, windowsHide: true, env }, (err, stdout) => {
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
