import { existsSync, readFileSync, watchFile } from "node:fs";
import type { ToolEvent, Mode, Warning } from "../types.js";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { computeOpenCalls } from "../warnings/open-calls.js";
import { detectLoop, detectRepeatError, detectHang } from "../warnings/detectors.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { NarrationEngine, type NarrateFn } from "../narration/engine.js";
import { runClaude } from "../narration/claude-headless.js";
import { renderNarration, renderHeader } from "../terminal/render.js";

const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;
const HANG_MS = 45_000;

export interface WatchState {
  engine: NarrationEngine;
  lastWarningKey: string | null;
}

export function createWatchState(mode: Mode, narrate: NarrateFn): WatchState {
  return { engine: new NarrationEngine(mode, narrate), lastWarningKey: null };
}

function activeWarning(events: ToolEvent[], now: number): Warning | null {
  return (
    detectLoop(events, LOOP_THRESHOLD) ??
    detectRepeatError(events, REPEAT_ERROR_THRESHOLD) ??
    detectHang(computeOpenCalls(events), now, HANG_MS)
  );
}

function warningKey(w: Warning): string {
  return `${w.kind}|${w.tool}|${w.count}`;
}

export interface TickResult { lines: string[]; }

export async function processTick(events: ToolEvent[], state: WatchState, now: number): Promise<TickResult> {
  const lines: string[] = [];

  const w = activeWarning(events, now);
  if (w) {
    const key = warningKey(w);
    if (key !== state.lastWarningKey) {
      lines.push(formatWarning(w));
      state.lastWarningKey = key;
    }
  }

  const narration = await state.engine.onEvents(events, now);
  if (narration) lines.push(renderNarration(narration));

  return { lines };
}

// --- thin glue: tail the JSONL file and print ticks ---

export function runWatch(sessionId: string, mode: Mode): void {
  const store = new SessionStore(sessionId);
  const state = createWatchState(mode, (p) => runClaude(p));
  console.log(renderHeader(mode));
  console.log(`(session: ${sessionId})`);

  const tick = async () => {
    if (!existsSync(store.path)) return;
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
  };

  watchFile(store.path, { interval: 1000 }, () => { void tick(); });
  void tick();
}
