import { join } from "node:path";
import { readStatus } from "../statusline/state.js";
import { renderStatus } from "../statusline/render.js";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";

export function statusLineFor(dir: string): string {
  const snap = readStatus(dir);
  return snap ? renderStatus(snap) : "";
}

// Claude Code passes session JSON on stdin; we fall back to the most recent session.
export function runStatusLine(): void {
  const session = latestSessionId();
  if (!session) { process.stdout.write(""); return; }
  process.stdout.write(statusLineFor(join(defaultRoot(), session)));
}
