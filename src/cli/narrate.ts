import { existsSync, readFileSync, watchFile } from "node:fs";
import type { ToolEvent, Mode } from "../types.js";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { createWatchState, activeWarning, type WatchState } from "./watch.js";
import { patchStatus } from "../statusline/state.js";
import { runClaude } from "../narration/claude-headless.js";

export async function narrateTick(dir: string, events: ToolEvent[], state: WatchState, now: number): Promise<void> {
  const w = activeWarning(events, now);
  patchStatus(dir, { warning: w ? formatWarning(w) : null });
  const why = await state.engine.onEvents(events, now);
  if (why) patchStatus(dir, { why });
}

export function runNarrate(sessionId: string, mode: Mode): void {
  const store = new SessionStore(sessionId);
  const state = createWatchState(mode, (p) => runClaude(p));
  patchStatus(store.dir, { mode });

  const tick = async () => {
    if (!existsSync(store.path)) return;
    const events: ToolEvent[] = [];
    for (const line of readFileSync(store.path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line) as ToolEvent); } catch { /* partial line */ }
    }
    const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
    await narrateTick(store.dir, reconcileErrors(events, turns), state, Date.now());
  };

  watchFile(store.path, { interval: 1000 }, () => { void tick(); });
  void tick();
}
