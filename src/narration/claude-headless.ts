import { execFile } from "node:child_process";
import { trimArgs, headlessExecOptions, SEGMENTER_SYSTEM_PROMPT } from "./headless-flags.js";

// Timeline segmentation gets the same context trim as live narration, but keeps a neutral system
// prompt because it must return strict JSON (see headless-flags.ts).
export function buildClaudeArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku", ...trimArgs(SEGMENTER_SYSTEM_PROMPT)];
}

// Runs the user's own Claude Code headless. Resolves to trimmed stdout, or null on failure.
// CODEY_HEADLESS marks this child so its own hook calls skip capture; otherwise every
// narration pass would record itself as a phantom session.
export function runClaude(prompt: string, timeoutMs = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("claude", buildClaudeArgs(prompt), headlessExecOptions(timeoutMs), (err, stdout) => {
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
