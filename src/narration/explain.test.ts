import { describe, it, expect } from "vitest";
import { eventsForCurrentTurn, currentTurnStart, buildExplainPrompt } from "./explain.js";
import type { ToolEvent } from "../types.js";

function ev(ts: number, tool = "Read"): ToolEvent {
  return { id: String(ts), phase: "pre", tool, server: null, input: { file_path: "a.ts" },
    inputHash: "h", isError: false, errorText: null, timestamp: ts, sessionId: "s" };
}

describe("currentTurnStart", () => {
  it("is the last prompt mark when present", () => {
    expect(currentTurnStart([100, 200, 300])).toBe(300);
  });
  it("is negative infinity with no prompt marks", () => {
    expect(currentTurnStart([])).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe("eventsForCurrentTurn", () => {
  it("keeps only events at or after the turn start", () => {
    const events = [ev(10), ev(250), ev(400)];
    expect(eventsForCurrentTurn(events, 300).map((e) => e.timestamp)).toEqual([400]);
  });
});

describe("buildExplainPrompt", () => {
  it("asks for a first plain-English explanation when there are no prior passes", () => {
    const p = buildExplainPrompt([ev(400)], []);
    expect(p).toContain("plain English");
    expect(p).not.toContain("already been told");
  });

  it("asks to go deeper and not repeat when prior passes exist", () => {
    const p = buildExplainPrompt([ev(400)], ["Claude edited a file.", "It refactored a helper."]);
    expect(p).toContain("already been told");
    expect(p).toContain("Claude edited a file.");
    expect(p).toContain("deeper");
  });
});
