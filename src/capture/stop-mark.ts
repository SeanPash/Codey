import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";

// Records when Claude last finished a turn so the status line can swap the live task
// for a clean summary of what just got done. Mirrors prompt-mark: it carries no
// ToolEvent, just a timestamp stamped onto the session snapshot.
export function handleStopInput(rawJson: string, now = Date.now(), root: string = defaultRoot()): void {
  const text = rawJson.trim();
  if (!text) return;
  let raw: { session_id?: string };
  try {
    raw = JSON.parse(text) as { session_id?: string };
  } catch {
    return; // never break the stop flow on bad input
  }
  if (!raw.session_id) return;
  const dir = join(root, raw.session_id);
  mkdirSync(dir, { recursive: true });
  patchStatus(dir, { doneAt: now });
}

function main(): void {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try { handleStopInput(raw); } catch { /* swallow */ }
    process.exit(0);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
