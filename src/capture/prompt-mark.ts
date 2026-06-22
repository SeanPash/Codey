import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";
import { appendPrompt } from "./prompts.js";

// Records when the user last submitted a prompt so the status line can show a
// "thinking" state in the gap before Claude's first tool call. Kept separate from
// the tool-capture hook because it carries no ToolEvent, just a timestamp.
export function handlePromptInput(rawJson: string, now = Date.now(), root: string = defaultRoot()): void {
  // Skip Codey's own headless narration (see hook-emit) so it never creates a phantom folder.
  if (process.env.CODEY_HEADLESS) return;
  const text = rawJson.trim();
  if (!text) return;
  let raw: { session_id?: string };
  try {
    raw = JSON.parse(text) as { session_id?: string };
  } catch {
    return; // never break the prompt flow on bad input
  }
  if (!raw.session_id) return;
  // A prompt can land before any tool has created the session folder.
  const dir = join(root, raw.session_id);
  mkdirSync(dir, { recursive: true });
  patchStatus(dir, { promptAt: now });
  appendPrompt(dir, now);
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
