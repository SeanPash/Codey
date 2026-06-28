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
import { readSpend } from "../cost/spend-log.js";
import { summarizeSpend } from "../cost/spend-summary.js";
import { activeWarning } from "../warnings/active.js";
import type { ToolEvent, Mode, Warning } from "../types.js";

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
  // Scope Codey's overhead to the current turn so the done footer reads "...this turn", matching the
  // recap above it. Before any prompt is stamped, the whole session counts as the turn.
  const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
  const overhead = summarizeSpend(readSpend(dir).filter((e) => e.ts >= turnStart));
  return renderStatus(composeView(readEvents(dir), { ...snap, mode: mode ?? snap.mode }, now, readWhys(dir), readBudget(dir), overhead));
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
const AMBER = "\x1b[38;5;214m"; // a tripped warning, the one thing off mode still speaks up about

// Shown when this session has no narration mode on. Codey is never really "off" here: it is still
// capturing every step to the timeline in the background. Saying "off" made that look dead, so we
// say what is true instead, then point at the two ways to look: the timeline shows the live run plus
// past sessions in the browser, while deep mode narrates the work right here in the terminal.
function offHint(): string {
  return `${BOLD}${BRAND}Codey${RESET} ${DIM}recording in background · ${RESET}${BRAND}/codey:timeline${RESET}`
    + `${DIM} for the live timeline · ${RESET}${BRAND}/codey:deep${RESET}${DIM} to narrate here${RESET}`;
}

// The short phrase for a tripped detector. loop/repeat_error count repetitions; hang counts seconds.
function offWarningText(w: Warning): string {
  if (w.kind === "loop") return `Possible loop: ${w.tool} x${w.count}`;
  if (w.kind === "repeat_error") return `Repeat error: ${w.tool} x${w.count}`;
  return `Possible hang: ${w.tool} ${w.count}s`;
}

// The one line off mode still shows: a free warning. It replaces the plain nudge while a detector
// is tripped, and still points at the timeline so the user can see what happened. No action line,
// no stage, nothing paid.
function renderOffWarning(w: Warning): string {
  return `${BOLD}${AMBER}!${RESET} ${AMBER}${offWarningText(w)}${RESET}`
    + `${DIM} · ${RESET}${BRAND}/codey:timeline${RESET}`;
}

// Render the line for one specific session. When Codey is on for the session we show its live
// narration; when it is off we show a quiet nudge toward a mode instead of nothing, so opening
// the timeline (which wires the status line) makes the HUD say how to start. We never guess a
// different session: a new tab must not inherit the previous tab's narration.
export function lineForSession(session: string | null, root: string, now: number): string {
  if (!session) return "";
  const dir = join(root, session);
  const mode = readSessionMode(dir);
  if (!mode) {
    // Off mode stays free, but the free detectors still run: a tripped warning is the one thing
    // worth speaking up about, so it replaces the plain nudge until the detector resets.
    const w = activeWarning(readEvents(dir), now);
    return w ? renderOffWarning(w) : offHint();
  }
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
