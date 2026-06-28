import type { ToolEvent } from "../types.js";
import type { StatusSnapshot } from "../statusline/state.js";
import { actionLabel, pastTense, shortTarget, rawTarget } from "../statusline/labels.js";
import { computeOpenCalls } from "../warnings/open-calls.js";
import { RUNNING_WINDOW_MS, turnInFlight } from "../cli/sessions.js";

export interface NowStep {
  label: string;
  status: "ok" | "fail";
}

// A small, cheap view of what Claude is doing right now, for the live strip. Built from the
// events tail and the statusline only, so it can be polled often without parsing transcripts.
export interface NowView {
  live: boolean;                              // something is actively happening
  // The current step: a friendly label, the tool name, and the literal target (the actual
  // command/path/pattern) so the strip can name exactly what Claude is on, not a vague phrase.
  action: { label: string; tool: string; detail: string | null } | null;
  since: number;                              // when the current step (or think) started
  thinking: boolean;                          // prompt in flight, no tool call yet
  steps: NowStep[];                           // last few completed steps, newest first
}

// How many just-finished steps to keep in the trail. Set generously so a burst of quick
// sub-second reads is never silently skipped between the longer step and the next poll.
const TRAIL = 5;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function currentLabel(tool: string, input: unknown): string {
  const a = actionLabel(tool, input);
  return cap(`${a.tag} ${shortTarget(a.target)}`).trim();
}

function baseName(p: string): string {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

// The literal target behind the current step, kept short so the strip can show exactly what
// Claude is on (the real command or filename), not just the friendly phrase. Paths collapse to
// their basename; commands and patterns are clipped to one readable line.
function currentDetail(tool: string, input: unknown): string | null {
  const raw = rawTarget(tool, input);
  if (!raw) return null;
  if (tool === "Read" || tool === "Edit" || tool === "MultiEdit" || tool === "Write") return baseName(raw);
  const line = raw.trim().split("\n")[0];
  return line.length > 56 ? line.slice(0, 55) + "…" : line;
}

function pastLabel(tool: string, input: unknown): string {
  const a = actionLabel(tool, input);
  return cap(`${pastTense(a.tag)} ${shortTarget(a.target)}`).trim();
}

// Pair each post with the oldest open pre of the same tool, so a finished step carries the
// input that lived on its pre. Returned in completion order.
function completedSteps(events: ToolEvent[]): NowStep[] {
  const open = new Map<string, ToolEvent[]>();
  const done: NowStep[] = [];
  for (const e of events) {
    const q = open.get(e.tool) ?? [];
    if (e.phase === "pre") {
      q.push(e);
      open.set(e.tool, q);
    } else {
      const pre = q.shift();
      open.set(e.tool, q);
      done.push({ label: pastLabel(e.tool, pre?.input ?? null), status: e.isError ? "fail" : "ok" });
    }
  }
  return done;
}

export function buildNowView(
  allEvents: ToolEvent[],
  status: StatusSnapshot | null,
  now: number,
  turnStart: number = Number.NEGATIVE_INFINITY,
  cancelledAt: number = 0,
): NowView {
  const empty: NowView = { live: false, action: null, since: 0, thinking: false, steps: [] };
  if (allEvents.length === 0 && !status) return empty;

  // The strip means "right now", so it only ever reflects the current turn. Scoping to events
  // on or after the latest prompt mark means a fresh prompt instantly drops the previous turn's
  // trail and any dangling open call, instead of showing the old step until new work lands.
  const events = allEvents.filter((e) => e.timestamp >= turnStart);

  const lastActivity = events.reduce((m, e) => Math.max(m, e.timestamp), 0);
  // A SessionEnd stamp newer than any activity means the terminal closed: never live.
  const closed = status?.closedAt != null && status.closedAt >= Math.max(lastActivity, status.promptAt ?? 0);
  if (closed) return { ...empty, steps: completedSteps(events).slice(-TRAIL).reverse() };

  const steps = completedSteps(events).slice(-TRAIL).reverse();

  // When Claude finishes a turn the Stop hook stamps doneAt. If that stamp is newer than every
  // other signal (the last tool event and the last prompt), the turn is genuinely over, so the
  // strip goes quiet at once with just the completed trail. No tool can still be running after a
  // Stop, so any leftover open "pre" is stale (an errored tool fires no PostToolUse, so its pre
  // never closes) and must not keep the strip live. A new prompt or tool call pushes a signal
  // past doneAt and relights it.
  const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
  const finished = status?.doneAt != null && status.doneAt >= lastSignal;
  // A user interrupt fires no Stop hook, so doneAt never lands and a dangling open "pre" keeps
  // the strip lit. The transcript's cancel marker is the only record: when it is newer than every
  // signal the turn is over, so the strip goes quiet with just the completed trail.
  const cancelled = cancelledAt > 0 && cancelledAt >= lastSignal;
  if (finished || cancelled) return { ...empty, steps };

  const openCalls = computeOpenCalls(events);
  const current = openCalls.length ? openCalls[openCalls.length - 1] : null;

  // The turn is still in flight whenever the prompt is newer than the last Stop. It stays lit for
  // the whole turn, however long Claude works: the finished/cancelled/closed checks above are the
  // real "off" signals, so the strip never goes dark mid-turn on a timer. This matches the
  // snapshot's isRunning, so the strip and the page's "Working now" badge never disagree.
  const inFlight = turnInFlight(status?.promptAt, status?.doneAt, lastActivity, now);
  // Thinking is the sub-state where Claude is reasoning before the first tool of the turn: in
  // flight, with the prompt newer than the last activity and nothing open yet.
  const thinking = !current && inFlight && status?.promptAt != null && status.promptAt > lastActivity;

  // A short trailing window bridges the brief gap between two back-to-back tools before any
  // in-flight signal is stamped (a session with no prompt mark yet).
  const recent = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
  const live = !!current || recent || inFlight;

  if (current) {
    const action = {
      label: currentLabel(current.tool, current.input),
      tool: current.tool,
      detail: currentDetail(current.tool, current.input),
    };
    return { live, action, since: current.timestamp, thinking: false, steps };
  }
  if (thinking) {
    return { live, action: null, since: status!.promptAt!, thinking: true, steps };
  }
  return { live, action: null, since: lastActivity, thinking: false, steps };
}
