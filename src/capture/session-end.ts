import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";

// Records when a session ended (the terminal closed, /clear, logout) so the timeline can
// stop showing it as a live/open terminal right away, instead of waiting out the activity
// window. A later resume bumps activity past this stamp, so the session lights up again.
export function handleSessionEndInput(rawJson: string, now = Date.now(), root: string = defaultRoot()): void {
  const text = rawJson.trim();
  if (!text) return;
  let raw: { session_id?: string };
  try {
    raw = JSON.parse(text) as { session_id?: string };
  } catch {
    return; // never break the session-end flow on bad input
  }
  if (!raw.session_id) return;
  const dir = join(root, raw.session_id);
  mkdirSync(dir, { recursive: true });
  patchStatus(dir, { closedAt: now });
}

function main(): void {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try { handleSessionEndInput(raw); } catch { /* swallow */ }
    process.exit(0);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
