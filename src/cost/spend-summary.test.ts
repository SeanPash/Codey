import { describe, it, expect } from "vitest";
import { summarizeSpend } from "./spend-summary.js";
import type { SpendEntry } from "../types.js";

const e = (over: Partial<SpendEntry>): SpendEntry => ({
  ts: 1,
  kind: "narration",
  mode: "deep",
  usage: { input: 10, output: 20, cacheRead: 70, cacheWrite: 0 },
  costUsd: 0.001,
  ...over,
});

describe("summarizeSpend", () => {
  it("returns zeroed totals for no entries", () => {
    const s = summarizeSpend([]);
    expect(s.total).toEqual({ calls: 0, tokens: 0, costUsd: 0 });
    expect(s.byKind.narration.calls).toBe(0);
    expect(s.byKind.timeline.calls).toBe(0);
    expect(s.byMode).toEqual({});
  });

  it("sums calls, tokens, and cost overall and per kind", () => {
    const s = summarizeSpend([
      e({ kind: "narration", mode: "deep", costUsd: 0.002 }),               // tokens 100
      e({ kind: "timeline", mode: null, usage: { input: 5, output: 5, cacheRead: 90, cacheWrite: 0 }, costUsd: 0.003 }), // tokens 100
    ]);
    expect(s.total).toEqual({ calls: 2, tokens: 200, costUsd: 0.005 });
    expect(s.byKind.narration).toEqual({ calls: 1, tokens: 100, costUsd: 0.002 });
    expect(s.byKind.timeline).toEqual({ calls: 1, tokens: 100, costUsd: 0.003 });
  });

  it("groups narration by mode and ignores mode for the segmenter", () => {
    const s = summarizeSpend([
      e({ kind: "narration", mode: "deep", costUsd: 0.001 }),
      e({ kind: "narration", mode: "deep", costUsd: 0.001 }),
      e({ kind: "narration", mode: "simple", costUsd: 0.001 }),
      e({ kind: "timeline", mode: null, costUsd: 0.001 }),
    ]);
    expect(s.byMode.deep?.calls).toBe(2);
    expect(s.byMode.simple?.calls).toBe(1);
    expect(s.byMode.teach).toBeUndefined();
  });
});
