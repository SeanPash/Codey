import { describe, it, expect } from "vitest";
import { formatUsd, overheadFooter } from "./format.js";
import type { CodeyOverhead } from "../types.js";

describe("formatUsd", () => {
  it("shows a sub-cent estimate as <$0.01 rather than $0.00", () => {
    expect(formatUsd(0.003)).toBe("<$0.01");
  });
  it("rounds to cents above a cent", () => {
    expect(formatUsd(0.028)).toBe("$0.03");
    expect(formatUsd(1.5)).toBe("$1.50");
  });
  it("shows exactly zero as $0.00", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });
});

describe("overheadFooter", () => {
  const o = (tokens: number, costUsd: number): CodeyOverhead => ({
    total: { calls: 1, tokens, costUsd },
    byKind: { narration: { calls: 1, tokens, costUsd }, timeline: { calls: 0, tokens: 0, costUsd: 0 } },
    byMode: {},
  });

  it("names the tokens and cost for the turn", () => {
    expect(overheadFooter(o(8200, 0.012))).toBe("Codey used 8.2k tok (~$0.01) this turn.");
  });

  it("returns null when nothing was spent, so the footer stays clean", () => {
    expect(overheadFooter(o(0, 0))).toBeNull();
  });
});
