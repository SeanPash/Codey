import { statSync } from "node:fs";
import { join } from "node:path";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readPrompts } from "../capture/prompts.js";
import { readTranscriptTurns, readFirstPrompt, readUserPrompts, readLastInterrupt, type UserPrompt } from "../timeline/transcript.js";
import { sessionDisplayName, projectFrom, sessionColor } from "../timeline/session-name.js";
import { readCustomName } from "../store/session-name-store.js";
import { chunksFor } from "../timeline/segment-cache.js";
import { buildSnapshot } from "./snapshot.js";
import { readSpend } from "../cost/spend-log.js";
import { summarizeSpend } from "../cost/spend-summary.js";
import { resolveActiveWarning } from "../intervene/active-warning.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { listSessions, RUNNING_WINDOW_MS, THINKING_WINDOW_MS } from "../cli/sessions.js";
import { selectActive } from "./active.js";
import { readStatus } from "../statusline/state.js";
import { readSessionMode } from "../statusline/active-mode.js";
import { explain, fillCachedExplanations, timelineDefaults, type ExplainResult } from "../timeline/explain-service.js";
import type { ExplainScope } from "../timeline/explain-cache.js";
import type { ExplainDepth } from "../timeline/explain-prompt.js";
import { runClaudeMetered } from "../narration/claude-metered.js";
import { readBudget, budgetLeftLabel } from "../budget/budget.js";
import { buildNowView, type NowView } from "./now.js";
import { readDismissed } from "../store/dismissed-store.js";
import type { SessionSnapshot, LiveSnapshot, LiveSession } from "../types.js";

// Running = the freshest of a captured tool call or a submitted prompt is within the window,
// so a session lights up the instant it is prompted, before any tool has run.
// Also stays live while Claude is thinking: promptAt newer than doneAt means a response is in flight.
export function isRunning(dir: string, now: number, cancelledAt = 0): boolean {
  let evMtime = 0;
  try { evMtime = statSync(join(dir, "events.jsonl")).mtimeMs; } catch { evMtime = 0; }
  const prompts = readPrompts(dir);
  const lastPrompt = prompts.length ? prompts[prompts.length - 1] : 0;
  const lastActivity = Math.max(evMtime, lastPrompt);
  const withinWindow = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
  // A prompt newer than the last stop means Claude is mid-response (thinking or tool calls),
  // but only count it for a bounded window so a terminal closed mid-turn (which never fired
  // Stop) does not stay live forever.
  const status = readStatus(dir);
  // A SessionEnd stamp newer than any activity means the terminal closed; it is not live.
  if (status?.closedAt != null && status.closedAt >= lastActivity) return false;
  const isThinking = status?.promptAt != null && status.promptAt > (status.doneAt ?? 0)
    && now - status.promptAt < THINKING_WINDOW_MS;
  // The Stop hook stamps doneAt when Claude finishes a turn. If that stamp is newer than every
  // other signal (last tool event and last prompt), the turn is over: drop live at once rather
  // than waiting out the recent-activity window, so a finished session stops pulsing right away.
  const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
  const finished = status?.doneAt != null && status.doneAt >= lastSignal;
  if (finished) return false;
  // A user interrupt fires no Stop hook, so doneAt never lands and the prompt looks "in flight"
  // for the whole thinking window. The transcript's cancel marker is the only record: when it is
  // newer than every other signal, treat it exactly like a finish and drop live now.
  if (cancelledAt > 0 && cancelledAt >= lastSignal) return false;
  return withinWindow || isThinking;
}

export function loadSnapshot(sessionId: string, root: string = defaultRoot()): SessionSnapshot {
  const store = new SessionStore(sessionId, root);
  const events = store.readAll();
  const meta = readMeta(sessionId, root);
  const turns = readTranscriptTurns(meta?.transcriptPath ?? null);
  const cancelledAt = readLastInterrupt(meta?.transcriptPath ?? null);
  const now = Date.now();
  const live = isRunning(store.dir, now, cancelledAt);
  // Freeze completed prompts: segmentation may only rework the current (live) turn. The turn
  // begins at the first event on or after the last prompt mark; everything before stays locked.
  const promptMarks = readPrompts(store.dir);
  const lastPrompt = promptMarks.length ? promptMarks[promptMarks.length - 1] : 0;
  const foundTurn = lastPrompt > 0 ? events.findIndex((e) => e.timestamp >= lastPrompt) : 0;
  const turnStartIndex = foundTurn >= 0 ? foundTurn : events.length;
  const rawChunks = chunksFor(sessionId, events, root, { live, turnStartIndex });
  let mtimeMs = 0;
  try { mtimeMs = statSync(store.path).mtimeMs; } catch { mtimeMs = 0; }
  const name = sessionDisplayName({
    firstChunkName: rawChunks[0]?.name ?? null,
    firstPrompt: readFirstPrompt(meta?.transcriptPath ?? null),
    sessionId,
    mtimeMs,
    customName: readCustomName(store.dir),
  });
  // Prompt boundaries come from the transcript (it has the text). Fall back to the prompt-log
  // timestamps, labeled generically, when no transcript is available.
  let prompts: UserPrompt[] = readUserPrompts(meta?.transcriptPath ?? null);
  if (prompts.length === 0) prompts = promptMarks.map((ts) => ({ ts, text: "" }));
  const { seedDepth, genAuto } = timelineDefaults(readSessionMode(store.dir));
  const snap = buildSnapshot({
    sessionId,
    sessionName: name,
    project: projectFrom(meta?.cwd ?? null),
    color: sessionColor(sessionId),
    live,
    events,
    rawChunks,
    turns,
    prompts,
    now,
    seedDepth,
    genAuto,
    cancelledAt,
    overhead: summarizeSpend(readSpend(store.dir)),
  });
  const reconciled = reconcileErrors(events, turns);
  const withMeta = {
    ...snap,
    activeWarning: live ? resolveActiveWarning(reconciled, Date.now()) : null,
    budgetLeft: budgetLeftLabel(readBudget(store.dir)),
  };
  // Show any explanations already generated at the seed depth without another round-trip.
  return fillCachedExplanations(withMeta, seedDepth, root);
}

// Cheap live view for the NOW strip: events tail + statusline only, no transcript or
// segmentation, so it is safe to poll about once a second while a session is live.
export function loadNow(sessionId: string, root: string = defaultRoot()): NowView {
  const store = new SessionStore(sessionId, root);
  // Scope to the current turn using the same prompt-mark boundary the snapshot uses, so the
  // live strip flips to the new prompt the instant it lands instead of trailing the old turn.
  const marks = readPrompts(store.dir);
  const turnStart = marks.length ? marks[marks.length - 1] : Number.NEGATIVE_INFINITY;
  const cancelledAt = readLastInterrupt(readMeta(sessionId, root)?.transcriptPath ?? null);
  return buildNowView(store.readAll(), readStatus(store.dir), Date.now(), turnStart, cancelledAt);
}

function isScope(s: unknown): s is ExplainScope {
  return s === "task" || s === "action" || s === "summary";
}
function isDepth(s: unknown): s is ExplainDepth {
  return s === "simple" || s === "deep" || s === "teach";
}
function safeId(id: string): boolean {
  return !!id && !id.includes("/") && !id.includes("\\") && !id.includes("..");
}

// Entry point for the explain endpoint: build the session snapshot, validate the request, and
// resolve it through the cache-or-generate service using the metered headless Claude.
export async function runExplain(sessionId: string, body: unknown, root: string = defaultRoot()): Promise<ExplainResult> {
  if (!safeId(sessionId)) return { text: null, cached: false, paused: false };
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!isScope(b.scope) || !isDepth(b.depth) || typeof b.id !== "string") {
    return { text: null, cached: false, paused: false };
  }
  const snap = loadSnapshot(sessionId, root);
  return explain(
    snap,
    { sessionId, scope: b.scope, id: b.id, depth: b.depth },
    { narrate: (prompt) => runClaudeMetered(prompt), root, sessionDir: join(root, sessionId) },
  );
}

// Compact snapshot for Live Split: one entry per active session, already ordered most
// recent prompt first. runningTool is the tool of a still-open pre-event (Claude is mid-call).
export function loadLive(root: string = defaultRoot()): LiveSnapshot {
  const all = selectActive(listSessions(root));
  const dismissed = readDismissed(root);
  // Hidden terminals the user dismissed: dropped from the grid but offered back for restore.
  const hidden = all.filter((s) => dismissed.has(s.id)).map((s) => ({ sessionId: s.id, name: s.name, color: s.color }));
  const active = all.filter((s) => !dismissed.has(s.id));
  const sessions: LiveSession[] = active.map((s) => {
    const snap = loadSnapshot(s.id, root);
    const events = new SessionStore(s.id, root).readAll();
    const last = events[events.length - 1];
    // listSessions reads only the statusline, so a cancelled turn still looks "thinking" to it.
    // The snapshot parsed the transcript and folded in the cancel, so trust its `live` here: a
    // terminal the user interrupted drops out of the pulse instead of lingering the full window.
    const running = s.running && snap.live;
    const runningTool = running && last && last.phase === "pre" ? last.tool : null;
    // The newest prompt group is the current turn. Surface its prompt text and cancelled flag so
    // a pane shows what the user asked and whether they interrupted it, like the single view does.
    // Guard on a real prompt mark so the synthetic "This session" group never reads as a question.
    const lastGroup = snap.groups[snap.groups.length - 1];
    const prompt = s.lastPromptTs > 0 && lastGroup ? lastGroup.prompt : "";
    const cancelled = lastGroup?.cancelled ?? false;
    // The current turn's group id, so a pane can offer "Summarize this prompt" the same way the
    // single view does. Null when there is no real prompt group yet.
    const groupId = s.lastPromptTs > 0 && lastGroup ? lastGroup.id : null;
    return {
      sessionId: s.id,
      name: s.name,
      project: s.project,
      color: s.color,
      workTotal: snap.workTotal,
      running,
      open: s.open,
      lastPromptTs: s.lastPromptTs,
      chunks: snap.chunks,
      // The full prompt history, so each pane renders as a real single-terminal timeline
      // (oldest prompt on top, newest below) instead of a single overwriting receipt.
      groups: snap.groups,
      runningTool,
      acted: s.acted,
      // Live but no tool open: Claude is thinking (before the first tool) or between calls.
      thinking: running && !runningTool,
      prompt,
      cancelled,
      groupId,
      seedDepth: snap.seedDepth,
    };
  });
  // liveCount is genuinely-running terminals; the badge/jump-to-live key off this, not "open".
  return { sessions, liveCount: sessions.filter((s) => s.running).length, hidden };
}
