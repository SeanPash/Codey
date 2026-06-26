import { describe, it, expect } from "vitest";
import { costUsd, HAIKU_RATES } from "./pricing.js";

describe("costUsd", () => {
  it("weights each token class by its Haiku rate", () => {
    // 1M of each class costs exactly its per-million rate.
    expect(costUsd({ input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(HAIKU_RATES.input, 6);
    expect(costUsd({ input: 0, output: 1_000_000, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(HAIKU_RATES.output, 6);
    expect(costUsd({ input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 0 })).toBeCloseTo(HAIKU_RATES.cacheRead, 6);
    expect(costUsd({ input: 0, output: 0, cacheRead: 0, cacheWrite: 1_000_000 })).toBeCloseTo(HAIKU_RATES.cacheWrite, 6);
  });

  it("matches a real warm narration call (~21k cache read, ~180 out) to a fraction of a cent", () => {
    const c = costUsd({ input: 10, output: 180, cacheRead: 21_460, cacheWrite: 0 });
    expect(c).toBeGreaterThan(0.002);
    expect(c).toBeLessThan(0.004);
  });

  it("is zero for an empty usage", () => {
    expect(costUsd({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })).toBe(0);
  });
});
