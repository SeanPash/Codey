import type { Usage } from "../types.js";

// Claude Haiku 4.5 per-million-token rates (USD). Cache reads bill at a tenth of input and cache
// writes at 1.25x, which is why a warm ~21k-context call costs a fraction of a cent: nearly all of
// it is cache read. These let us report Codey's real cost rather than a naive tokens x rate guess.
export const HAIKU_RATES = {
  input: 1.0,
  output: 5.0,
  cacheRead: 0.1,
  cacheWrite: 1.25,
} as const;

export function costUsd(u: Usage): number {
  return (
    u.input * HAIKU_RATES.input +
    u.output * HAIKU_RATES.output +
    u.cacheRead * HAIKU_RATES.cacheRead +
    u.cacheWrite * HAIKU_RATES.cacheWrite
  ) / 1_000_000;
}
