import { execFile } from "node:child_process";
import { trimArgs, headlessExecOptions, SEGMENTER_SYSTEM_PROMPT } from "./headless-flags.js";
import { runMetered, type MeteredResult } from "./claude-metered.js";

// Timeline segmentation gets the same context trim as live narration, but keeps a neutral system
// prompt because it must return strict JSON (see headless-flags.ts).
export function buildClaudeArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku", ...trimArgs(SEGMENTER_SYSTEM_PROMPT)];
}

// Same call as buildClaudeArgs but asks for json output, so the segmenter's token usage comes back
// and can be logged to the Codey-overhead account alongside live narration.
export function buildSegmenterMeteredArgs(prompt: string): string[] {
  return ["-p", prompt, "--model", "haiku", "--output-format", "json", ...trimArgs(SEGMENTER_SYSTEM_PROMPT)];
}

// Segmentation is a one-shot pass; allow a longer budget than live narration. Returns the JSON text
// (in result) plus usage, or null on failure.
export function runSegmentationMetered(prompt: string, timeoutMs = 30_000): Promise<MeteredResult | null> {
  return runMetered(buildSegmenterMeteredArgs(prompt), prompt, timeoutMs);
}

// Runs the user's own Claude Code headless. Resolves to trimmed stdout, or null on failure.
// CODEY_HEADLESS marks this child so its own hook calls skip capture; otherwise every
// narration pass would record itself as a phantom session.
export function runClaude(prompt: string, timeoutMs = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    const child = execFile("claude", buildClaudeArgs(prompt), headlessExecOptions(timeoutMs), (err, stdout) => {
      if (err) return resolve(null);
      const out = stdout.trim();
      resolve(out.length > 0 ? out : null);
    });
    // Close stdin so headless claude does not sit ~3s waiting for input it will never get.
    child.stdin?.end();
  });
}

// Segmentation is a one-shot headless pass; allow a longer budget than live narration.
export function runSegmentation(prompt: string): Promise<string | null> {
  return runClaude(prompt, 30_000);
}
