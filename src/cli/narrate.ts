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
import { readBudget, addSpend, budgetAllows, type Budget } from "../budget/budget.js";
import { appendSpend } from "../cost/spend-log.js";
import { logNarrator } from "../narration/narrator-log.js";
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
    if (!budgetAllows(b)) return null; // budget exhausted: pause auto-narration
    const r = await metered(prompt);
    if (!r) return null;
    meter(r.tokens);
    return r.text;
  };
}

export function runNarrate(sessionId: string, mode: Mode): void {
  const store = new SessionStore(sessionId);
  logNarrator(store.dir, `narrator started (mode ${mode}, pid ${process.pid})`);
  // Meter every real narration call into the Codey-overhead log so the timeline and statusline can
  // show exactly what narration cost. Logging happens here, after the budget gate inside
  // makeBudgetedNarrate decides to spend, so a skipped (budget-paused) call records nothing.
  // A failed call leaves a reason in narrator.log so a silent narrator is never a mystery.
  const meteredAndLogged = async (p: string) => {
    const r = await runClaudeMetered(p, 45000, (info) => logNarrator(store.dir, `narration failed: ${info}`));
    if (r) appendSpend(store.dir, { ts: Date.now(), kind: "narration", mode, usage: r.usage, costUsd: r.costUsd });
    return r;
  };
  const narrate = makeBudgetedNarrate(
    () => readBudget(store.dir),
    meteredAndLogged,
    (tokens) => addSpend(store.dir, tokens),
  );
  const state = createWatchState(mode, narrate);
  patchStatus(store.dir, { mode });

  // A narration pass can take seconds (it shells out to claude). Without this guard a burst of
  // file changes would fire overlapping ticks that each spawn their own claude before the
  // throttle state is updated, multiplying processes and overshooting the budget.
  let inFlight = false;
  const tick = async () => {
    if (inFlight) return;
    if (!existsSync(store.path)) return;
    inFlight = true;
    try {
      const events: ToolEvent[] = [];
      for (const line of readFileSync(store.path, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try { events.push(JSON.parse(line) as ToolEvent); } catch { /* partial line */ }
      }
      const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
      await narrateTick(store.dir, reconcileErrors(events, turns), state, Date.now());
    } finally {
      inFlight = false;
    }
  };

  watchFile(store.path, { interval: 1000 }, () => { void tick(); });
  void tick();
}
