import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { readStatus, type StatusSnapshot } from "../statusline/state.js";
import { composeView } from "../statusline/compose.js";
import { renderStatus } from "../statusline/render.js";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";
import { readSessionMode } from "../statusline/active-mode.js";
import { readWhys } from "../narration/history.js";
import { readBudget } from "../budget/budget.js";
import type { ToolEvent, Mode } from "../types.js";

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

export function statusLineFor(dir: string, now = Date.now(), mode?: Mode): string {
  if (!existsSync(dir)) return "";
  const snap: StatusSnapshot = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  return renderStatus(composeView(readEvents(dir), { ...snap, mode: mode ?? snap.mode }, now, readWhys(dir), readBudget(dir)));
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

// ANSI bits for the off hint, kept local so this file owns its one tiny line.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BRAND = "\x1b[38;5;75m"; // the Codey name and the mode commands, sky blue
const DIM = "\x1b[38;5;244m";  // the surrounding words sit quietly

// Shown when Codey is wired but this session has no mode on. Rather than a blank line, point at
// the two ways in: the timeline opens a live visual storyboard in the browser, while deep mode
// narrates the work right here in the terminal. Naming both makes the difference obvious.
function offHint(): string {
  return `${BOLD}${BRAND}Codey${RESET} ${DIM}off · ${RESET}${BRAND}/codey:timeline${RESET}`
    + `${DIM} for a live timeline · ${RESET}${BRAND}/codey:deep${RESET}${DIM} to narrate this session${RESET}`;
}

// Render the line for one specific session. When Codey is on for the session we show its live
// narration; when it is off we show a quiet nudge toward a mode instead of nothing, so opening
// the timeline (which wires the status line) makes the HUD say how to start. We never guess a
// different session: a new tab must not inherit the previous tab's narration.
export function lineForSession(session: string | null, root: string, now: number): string {
  if (!session) return "";
  const dir = join(root, session);
  const mode = readSessionMode(dir);
  if (!mode) return offHint();
  return statusLineFor(dir, now, mode);
}

// Claude Code pipes a JSON payload (session_id, cwd, model, ...) on stdin. We key the
// status line to that exact session so each terminal only ever shows its own work.
export function runStatusLine(): void {
  if (process.stdin.isTTY) {
    // Manual run with no payload (a human previewing the line): use the latest session.
    process.stdout.write(lineForSession(latestSessionId(), defaultRoot(), Date.now()));
    return;
  }
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    const session = sessionFromPayload(raw);
    process.stdout.write(lineForSession(session, defaultRoot(), Date.now()));
  });
}
