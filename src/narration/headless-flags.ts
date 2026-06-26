import { tmpdir } from "node:os";
import type { ExecFileOptionsWithStringEncoding } from "node:child_process";
import { headlessEnv } from "./claude-spawn.js";

// Tools the headless narrator never uses. Disabling them keeps Claude Code's tool schemas (~11k
// tokens, the single biggest chunk of the per-call context) out of every narration call.
export const DISALLOWED_TOOLS = [
  "Bash", "Edit", "Read", "Write", "Glob", "Grep", "WebFetch", "WebSearch", "Task",
  "NotebookEdit", "TodoWrite", "BashOutput", "KillShell",
];

// Live narration writes a single plain sentence. Replacing the default system prompt with this drops
// Claude Code's ~6k default and keeps the model on task.
export const NARRATOR_SYSTEM_PROMPT =
  "You narrate what an AI coding agent is doing for someone watching it work. " +
  "Reply with only the narration in plain English: no preamble, no markdown, no tool names as nouns.";

// Segmentation must return a strict JSON shape, so its system prompt only enforces obedience to the
// user prompt's format rather than dictating a sentence.
export const SEGMENTER_SYSTEM_PROMPT =
  "You are a precise assistant. Follow the user's instructions and output format exactly, with no extra text.";

// The context-trimming flags every headless call shares. Empty setting sources mean the user's
// SessionStart hooks (superpowers, memory) never fire; excluding the dynamic sections keeps the
// cached system prompt stable; a tiny system prompt replaces the ~6k default; disabling tools drops
// their schemas. Together these take the per-call context from ~27k to ~4k while keeping OAuth.
export function trimArgs(systemPrompt: string): string[] {
  return [
    "--setting-sources", "",
    "--exclude-dynamic-system-prompt-sections",
    "--system-prompt", systemPrompt,
    "--disallowed-tools", DISALLOWED_TOOLS.join(" "),
  ];
}

// Run headless from a neutral directory so the project's CLAUDE.md/rules.md is not auto-discovered,
// decode stdout as utf8, and carry CODEY_HEADLESS so any hook that does run skips capture.
export function headlessExecOptions(timeoutMs: number): ExecFileOptionsWithStringEncoding {
  return { timeout: timeoutMs, shell: false, windowsHide: true, cwd: tmpdir(), env: headlessEnv(), encoding: "utf8" };
}
