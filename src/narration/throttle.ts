import type { Mode } from "../types.js";

interface ThrottleState {
  newEvents: number;   // events seen since last narration
  msSinceLast: number; // ms since last narration
}

// simple still carries a short "why", just refreshed less often and capped by the time
// floor so it stays cheap. deep refreshes more eagerly and says more.
const PACING: Record<Mode, { everyN: number; minMs: number }> = {
  simple: { everyN: 1, minMs: 7000 },
  deep: { everyN: 2, minMs: 3000 },
  teach: { everyN: 3, minMs: 5000 },
};

export function shouldNarrate(mode: Mode, state: ThrottleState): boolean {
  const p = PACING[mode];
  return state.newEvents >= p.everyN && state.msSinceLast >= p.minMs;
}
