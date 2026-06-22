import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";
import { writeMetaIfAbsent, readMeta } from "../store/session-meta.js";
import { readSessionMode, writeSessionMode, inheritedMode } from "../statusline/active-mode.js";
import { appendPrompt } from "./prompts.js";

// Records when the user last submitted a prompt so the status line can show a
// "thinking" state in the gap before Claude's first tool call. Kept separate from
// the tool-capture hook because it carries no ToolEvent, just a timestamp.
export function handlePromptInput(rawJson: string, now = Date.now(), root: string = defaultRoot()): void {
  // Skip Codey's own headless narration (see hook-emit) so it never creates a phantom folder.
  if (process.env.CODEY_HEADLESS) return;
  const text = rawJson.trim();
  if (!text) return;
  let raw: { session_id?: string; transcript_path?: string; cwd?: string };
  try {
    raw = JSON.parse(text) as { session_id?: string; transcript_path?: string; cwd?: string };
  } catch {
    return; // never break the prompt flow on bad input
  }
  if (!raw.session_id) return;
  // A prompt can land before any tool has created the session folder.
  const dir = join(root, raw.session_id);
  mkdirSync(dir, { recursive: true });
  // No meta yet means this is the session's first prompt. Check before writing it below.
  const firstPrompt = readMeta(raw.session_id, root) === null;
  patchStatus(dir, { promptAt: now });
  appendPrompt(dir, now);
  // Record the transcript path and cwd here too, not just on tool calls, so a turn with no
  // tools (a plain chat, a slash command, a skill) still has a real name and timeline content.
  writeMetaIfAbsent(
    { sessionId: raw.session_id, transcriptPath: raw.transcript_path ?? null, cwd: raw.cwd ?? null },
    root,
  );
  // Carry Codey's mode across /clear and resume, which spin up a new session id in the same
  // directory. Only on the first prompt, and only when nothing is set yet, so turning Codey
  // off in a session is never silently undone.
  if (firstPrompt && readSessionMode(dir) === null) {
    const inherit = inheritedMode(raw.cwd ?? null, raw.session_id, root);
    if (inherit) writeSessionMode(inherit, dir);
  }
}

function main(): void {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try { handlePromptInput(raw); } catch { /* swallow */ }
    process.exit(0);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
