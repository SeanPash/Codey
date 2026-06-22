import { statSync } from "node:fs";
import { join } from "node:path";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readPrompts } from "../capture/prompts.js";
import { readTranscriptTurns, readFirstPrompt, readUserPrompts, type UserPrompt } from "../timeline/transcript.js";
import { sessionDisplayName, projectFrom, sessionColor } from "../timeline/session-name.js";
import { readCustomName } from "../store/session-name-store.js";
import { chunksFor } from "../timeline/segment-cache.js";
import { buildSnapshot } from "./snapshot.js";
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
import type { SessionSnapshot, LiveSnapshot, LiveSession } from "../types.js";

// Running = the freshest of a captured tool call or a submitted prompt is within the window,
// so a session lights up the instant it is prompted, before any tool has run.
// Also stays live while Claude is thinking: promptAt newer than doneAt means a response is in flight.
export function isRunning(dir: string, now: number): boolean {
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
  const isThinking = status?.promptAt != null && status.promptAt > (status.doneAt ?? 0)
    && now - status.promptAt < THINKING_WINDOW_MS;
  return withinWindow || isThinking;
}

export function loadSnapshot(sessionId: string, root: string = defaultRoot()): SessionSnapshot {
  const store = new SessionStore(sessionId, root);
  const events = store.readAll();
  const meta = readMeta(sessionId, root);
  const turns = readTranscriptTurns(meta?.transcriptPath ?? null);
  const rawChunks = chunksFor(sessionId, events, root);
  const now = Date.now();
  const live = isRunning(store.dir, now);
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
  if (prompts.length === 0) prompts = readPrompts(store.dir).map((ts) => ({ ts, text: "" }));
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
  const active = selectActive(listSessions(root));
  const sessions: LiveSession[] = active.map((s) => {
    const snap = loadSnapshot(s.id, root);
    const events = new SessionStore(s.id, root).readAll();
    const last = events[events.length - 1];
    const runningTool = s.running && last && last.phase === "pre" ? last.tool : null;
    return {
      sessionId: s.id,
      name: s.name,
      project: s.project,
      color: s.color,
      workTotal: snap.workTotal,
      running: s.running,
      open: s.open,
      lastPromptTs: s.lastPromptTs,
      chunks: snap.chunks,
      runningTool,
    };
  });
  // liveCount is genuinely-running terminals; the badge/jump-to-live key off this, not "open".
  return { sessions, liveCount: sessions.filter((s) => s.running).length };
}
