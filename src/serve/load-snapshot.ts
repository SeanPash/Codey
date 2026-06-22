import { statSync } from "node:fs";
import { join } from "node:path";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readPrompts } from "../capture/prompts.js";
import { readTranscriptTurns, readFirstPrompt } from "../timeline/transcript.js";
import { sessionDisplayName, projectFrom, sessionColor } from "../timeline/session-name.js";
import { chunksFor } from "../timeline/segment-cache.js";
import { buildSnapshot } from "./snapshot.js";
import { resolveActiveWarning } from "../intervene/active-warning.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { listSessions, RUNNING_WINDOW_MS } from "../cli/sessions.js";
import { selectActive } from "./active.js";
import type { SessionSnapshot, LiveSnapshot, LiveSession } from "../types.js";

// Running = the freshest of a captured tool call or a submitted prompt is within the window,
// so a session lights up the instant it is prompted, before any tool has run.
function isRunning(dir: string, now: number): boolean {
  let evMtime = 0;
  try { evMtime = statSync(join(dir, "events.jsonl")).mtimeMs; } catch { evMtime = 0; }
  const prompts = readPrompts(dir);
  const lastPrompt = prompts.length ? prompts[prompts.length - 1] : 0;
  const lastActivity = Math.max(evMtime, lastPrompt);
  return lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
}

export function loadSnapshot(sessionId: string, root: string = defaultRoot()): SessionSnapshot {
  const store = new SessionStore(sessionId, root);
  const events = store.readAll();
  const meta = readMeta(sessionId, root);
  const turns = readTranscriptTurns(meta?.transcriptPath ?? null);
  const rawChunks = chunksFor(sessionId, events, root);
  const live = isRunning(store.dir, Date.now());
  let mtimeMs = 0;
  try { mtimeMs = statSync(store.path).mtimeMs; } catch { mtimeMs = 0; }
  const name = sessionDisplayName({
    firstChunkName: rawChunks[0]?.name ?? null,
    firstPrompt: readFirstPrompt(meta?.transcriptPath ?? null),
    sessionId,
    mtimeMs,
  });
  const snap = buildSnapshot({
    sessionId,
    sessionName: name,
    project: projectFrom(meta?.cwd ?? null),
    color: sessionColor(sessionId),
    live,
    events,
    rawChunks,
    turns,
  });
  const reconciled = reconcileErrors(events, turns);
  return { ...snap, activeWarning: live ? resolveActiveWarning(reconciled, Date.now()) : null };
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
