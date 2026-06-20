import type { Mode } from "../types.js";

interface ThrottleState {
  newEvents: number;   // events seen since last narration
  msSinceLast: number; // ms since last narration
}

const PACING: Record<Mode, { everyN: number; minMs: number }> = {
  simple: { everyN: 5, minMs: 8000 },
  deep: { everyN: 2, minMs: 3000 },
};

export function shouldNarrate(mode: Mode, state: ThrottleState): boolean {
  const p = PACING[mode];
  return state.newEvents >= p.everyN && state.msSinceLast >= p.minMs;
}
