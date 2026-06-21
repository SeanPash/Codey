import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { readStatus, type StatusSnapshot } from "../statusline/state.js";
import { composeView } from "../statusline/compose.js";
import { renderStatus } from "../statusline/render.js";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";
import { readSessionMode } from "../statusline/active-mode.js";
import type { ToolEvent, Mode } from "../types.js";

const DWELL_MS = 4500;

function readEvents(dir: string): ToolEvent[] {
  const p = join(dir, "events.jsonl");
  if (!existsSync(p)) return [];
  const out: ToolEvent[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as ToolEvent); } catch { /* partial line */ }
  }
  return out;
}

export function statusLineFor(dir: string, now = Date.now(), dwellMs = DWELL_MS, mode?: Mode): string {
  if (!existsSync(dir)) return "";
  const snap: StatusSnapshot = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  return renderStatus(composeView(readEvents(dir), { ...snap, mode: mode ?? snap.mode }, now, dwellMs));
}

// Pull the session id out of the JSON payload Claude Code pipes to the status line.
function sessionFromPayload(payload: string): string | null {
  try {
    const o = JSON.parse(payload) as { session_id?: unknown };
    return typeof o.session_id === "string" && o.session_id ? o.session_id : null;
  } catch {
    return null;
  }
}

// Render the line for one specific session. Returns "" (blank) unless that session has
// Codey turned on, so a fresh tab shows nothing until the user opts in. We never guess a
// different session: a new tab must not inherit the previous tab's narration.
export function lineForSession(session: string | null, root: string, now: number, dwellMs: number): string {
  if (!session) return "";
  const dir = join(root, session);
  const mode = readSessionMode(dir);
  if (!mode) return "";
  return statusLineFor(dir, now, dwellMs, mode);
}

// Claude Code pipes a JSON payload (session_id, cwd, model, ...) on stdin. We key the
// status line to that exact session so each terminal only ever shows its own work.
export function runStatusLine(): void {
  if (process.stdin.isTTY) {
    // Manual run with no payload (a human previewing the line): use the latest session.
    process.stdout.write(lineForSession(latestSessionId(), defaultRoot(), Date.now(), DWELL_MS));
    return;
  }
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    const session = sessionFromPayload(raw);
    process.stdout.write(lineForSession(session, defaultRoot(), Date.now(), DWELL_MS));
  });
}
