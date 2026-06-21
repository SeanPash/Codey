import { statSync } from "node:fs";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns, readFirstPrompt } from "../timeline/transcript.js";
import { sessionDisplayName } from "../timeline/session-name.js";
import { chunksFor } from "../timeline/segment-cache.js";
import { buildSnapshot } from "./snapshot.js";
import { resolveActiveWarning } from "../intervene/active-warning.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import type { SessionSnapshot } from "../types.js";

const LIVE_WINDOW_MS = 15_000; // file touched this recently => still live

function isLive(path: string): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs < LIVE_WINDOW_MS;
  } catch {
    return false;
  }
}

export function loadSnapshot(sessionId: string, root: string = defaultRoot()): SessionSnapshot {
  const store = new SessionStore(sessionId, root);
  const events = store.readAll();
  const meta = readMeta(sessionId, root);
  const turns = readTranscriptTurns(meta?.transcriptPath ?? null);
  const rawChunks = chunksFor(sessionId, events, root);
  const live = isLive(store.path);
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
    live,
    events,
    rawChunks,
    turns,
  });
  const reconciled = reconcileErrors(events, turns);
  return { ...snap, activeWarning: live ? resolveActiveWarning(reconciled, Date.now()) : null };
}
