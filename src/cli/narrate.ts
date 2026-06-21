import { existsSync, readFileSync, watchFile } from "node:fs";
import type { ToolEvent, Mode } from "../types.js";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { createWatchState, activeWarning, type WatchState } from "./watch.js";
import { patchStatus } from "../statusline/state.js";
import { appendWhy } from "../narration/history.js";
import { runClaudeMetered, type MeteredResult } from "../narration/claude-metered.js";
import { readBudget, addSpend, type Budget } from "../budget/budget.js";
import type { NarrateFn } from "../narration/engine.js";

export async function narrateTick(dir: string, events: ToolEvent[], state: WatchState, now: number): Promise<void> {
  const w = activeWarning(events, now);
  patchStatus(dir, { warning: w ? formatWarning(w) : null });
  const why = await state.engine.onEvents(events, now);
  if (why) {
    patchStatus(dir, { why });
    appendWhy(dir, { ts: now, why });
  }
}

// The narrate function the engine calls. It enforces the budget at the spend point and
// meters real token cost, so neither the engine nor the throttle needs to know about budgets.
export function makeBudgetedNarrate(
  getBudget: () => Budget | null,
  metered: (prompt: string) => Promise<MeteredResult | null>,
  meter: (tokens: number) => void,
): NarrateFn {
  return async (prompt: string) => {
    const b = getBudget();
    if (b && b.spent >= b.cap) return null; // budget exhausted: pause auto-narration
    const r = await metered(prompt);
    if (!r) return null;
    meter(r.tokens);
    return r.text;
  };
}

export function runNarrate(sessionId: string, mode: Mode): void {
  const store = new SessionStore(sessionId);
  const narrate = makeBudgetedNarrate(
    () => readBudget(store.dir),
    (p) => runClaudeMetered(p),
    (tokens) => addSpend(store.dir, tokens),
  );
  const state = createWatchState(mode, narrate);
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
