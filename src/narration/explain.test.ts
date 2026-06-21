import { describe, it, expect } from "vitest";
import { eventsForCurrentTurn, currentTurnStart, buildExplainPrompt, parseExplainArgs, eventForTask } from "./explain.js";
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

  it("varies the instruction by depth", () => {
    expect(buildExplainPrompt([ev(400)], [], "simple")).toContain("one plain English sentence");
    expect(buildExplainPrompt([ev(400)], [], "teach")).toContain("teach the key concept");
  });
});

describe("parseExplainArgs", () => {
  it("defaults to deep depth and no task", () => {
    expect(parseExplainArgs([])).toEqual({ depth: "deep", task: null });
  });

  it("reads a depth word", () => {
    expect(parseExplainArgs(["teach"])).toEqual({ depth: "teach", task: null });
  });

  it("reads a task number with or without a hash", () => {
    expect(parseExplainArgs(["3"])).toEqual({ depth: "deep", task: 3 });
    expect(parseExplainArgs(["#5"])).toEqual({ depth: "deep", task: 5 });
  });

  it("reads a depth and a task in either order", () => {
    expect(parseExplainArgs(["simple", "2"])).toEqual({ depth: "simple", task: 2 });
    expect(parseExplainArgs(["2", "simple"])).toEqual({ depth: "simple", task: 2 });
  });

  it("ignores tokens it does not understand", () => {
    expect(parseExplainArgs(["banana"])).toEqual({ depth: "deep", task: null });
  });
});

describe("eventForTask", () => {
  it("picks the Nth pre event in the turn (1-based)", () => {
    const turn = [ev(10), ev(20), ev(30)];
    expect(eventForTask(turn, 2).map((e) => e.timestamp)).toEqual([20]);
  });

  it("is empty when the task number is out of range", () => {
    expect(eventForTask([ev(10)], 4)).toEqual([]);
  });
});
