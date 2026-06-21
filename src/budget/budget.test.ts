import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readBudget, armBudget, clearBudget, addSpend,
  budgetAllows, budgetLeftLabel, budgetPausedMessage, budgetStatusLine, formatTokens,
} from "./budget.js";

function tmp() { return mkdtempSync(join(tmpdir(), "codey-budget-")); }

describe("budget file model", () => {
  it("absent file means uncapped", () => {
    expect(readBudget(tmp())).toBeNull();
  });

  it("arm sets cap with zero spent; addSpend accumulates", () => {
    const dir = tmp();
    armBudget(dir, 5000);
    expect(readBudget(dir)).toEqual({ cap: 5000, spent: 0 });
    addSpend(dir, 120);
    addSpend(dir, 80);
    expect(readBudget(dir)).toEqual({ cap: 5000, spent: 200 });
  });

  it("clear removes the cap", () => {
    const dir = tmp();
    armBudget(dir, 100);
    clearBudget(dir);
    expect(readBudget(dir)).toBeNull();
  });

  it("addSpend is a no-op when uncapped", () => {
    const dir = tmp();
    addSpend(dir, 50);
    expect(readBudget(dir)).toBeNull();
  });
});

describe("budget gate and formatting", () => {
  it("allows under cap and when uncapped, blocks at or over", () => {
    expect(budgetAllows(null)).toBe(true);
    expect(budgetAllows({ cap: 100, spent: 99 })).toBe(true);
    expect(budgetAllows({ cap: 100, spent: 100 })).toBe(false);
    expect(budgetAllows({ cap: 100, spent: 130 })).toBe(false);
  });

  it("formats token counts compactly", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(3800)).toBe("3.8k");
    expect(formatTokens(12000)).toBe("12k");
  });

  it("shows remaining while under cap, and a reached label at the cap", () => {
    expect(budgetLeftLabel({ cap: 5000, spent: 1200 })).toBe("3.8k left");
    expect(budgetLeftLabel({ cap: 5000, spent: 5000 })).toBe("budget reached");
    expect(budgetLeftLabel(null)).toBeNull();
  });

  it("paused message only once the cap is reached", () => {
    expect(budgetPausedMessage({ cap: 5000, spent: 1200 })).toBeNull();
    expect(budgetPausedMessage({ cap: 5000, spent: 5000 })).toContain("Auto-explaining paused");
  });

  it("status line reads the spent / cap / remaining", () => {
    expect(budgetStatusLine(null)).toContain("No budget set");
    expect(budgetStatusLine({ cap: 5000, spent: 1200 })).toContain("3.8k left");
  });
});
