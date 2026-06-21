import type { AssistantTurn } from "./transcript.js";

export interface SessionTotals {
  work: number;     // output tokens, the real cost of what got done
  context: number;  // input + cache, counted once across the whole session
  total: number;    // work + context
}

// Sum the transcript once. Unlike summing per-chunk tokenTotal, this never re-counts the
// shared cached context, so the session total is honest.
export function sessionTotals(turns: AssistantTurn[]): SessionTotals {
  let work = 0;
  let context = 0;
  for (const t of turns) {
    work += t.outputTokens;
    context += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
  }
  return { work, context, total: work + context };
}
