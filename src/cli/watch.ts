import { existsSync, readFileSync, watchFile } from "node:fs";
import type { ToolEvent, Mode, Warning } from "../types.js";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { activeWarning } from "../warnings/active.js";
import { NarrationEngine, type NarrateFn } from "../narration/engine.js";
import { runClaude } from "../narration/claude-headless.js";
import { renderNarration, renderHeader, renderCaption } from "../terminal/render.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption } from "../caption/caption.js";

export { activeWarning };

export interface WatchState {
  engine: NarrationEngine;
  mode: Mode;
  lastWarningKey: string | null;
  lastActionKey: string | null;
}

export function createWatchState(mode: Mode, narrate: NarrateFn): WatchState {
  return { engine: new NarrationEngine(mode, narrate), mode, lastWarningKey: null, lastActionKey: null };
}

function warningKey(w: Warning): string {
  return `${w.kind}|${w.tool}|${w.count}`;
}

export interface TickResult { lines: string[]; }

export async function processTick(events: ToolEvent[], state: WatchState, now: number): Promise<TickResult> {
  const lines: string[] = [];

  // The live phase is the latest stage chunk. It only reprints when the phase actually
  // changes, so a burst of reads is one "inspecting" line, not ten tool calls.
  const chunks = chunkEvents(events);
  const current = chunks[chunks.length - 1];
  if (current) {
    const caption = buildCaption(current, state.mode, null);
    const key = `${caption.stage}|${caption.title}`;
    if (key !== state.lastActionKey) {
      lines.push(renderCaption(caption));
      state.lastActionKey = key;
    }
  }

  const w = activeWarning(events, now);
  if (w) {
    const key = warningKey(w);
    if (key !== state.lastWarningKey) {
      lines.push(formatWarning(w));
      state.lastWarningKey = key;
    }
  }

  const narration = await state.engine.onEvents(events, now, !!w);
  if (narration) lines.push(renderNarration(narration));

  return { lines };
}

// --- thin glue: tail the JSONL file and print ticks ---

export function runWatch(sessionId: string, mode: Mode): void {
  const store = new SessionStore(sessionId);
  const state = createWatchState(mode, (p) => runClaude(p));
  console.log(renderHeader(mode));
  console.log(`(session: ${sessionId})`);

  // Skip a tick while the previous one is still narrating, so a burst of file changes cannot
  // start overlapping claude passes before the cadence state has caught up.
  let inFlight = false;
  const tick = async () => {
    if (inFlight) return;
    if (!existsSync(store.path)) return;
    inFlight = true;
    try {
      const events: ToolEvent[] = [];
      for (const line of readFileSync(store.path, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line) as ToolEvent);
        } catch {
          // Skip a partial or malformed line (e.g. read while the hook is mid-write).
        }
      }
      // Errored tools never produce a PostToolUse, so fold their outcome in from the transcript.
      const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
      const result = await processTick(reconcileErrors(events, turns), state, Date.now());
      for (const line of result.lines) console.log(line);
    } finally {
      inFlight = false;
    }
  };

  watchFile(store.path, { interval: 1000 }, () => { void tick(); });
  void tick();
}
