import { describe, it, expect } from "vitest";
import { naiveSegment, buildSegmentationPrompt, parseSegmentation } from "./segment.js";
import type { ToolEvent } from "../types.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}

describe("naiveSegment", () => {
  it("returns no chunks for no events", () => {
    expect(naiveSegment([])).toEqual([]);
  });

  it("returns a single chunk starting at 0 for a tight burst", () => {
    const chunks = naiveSegment([ev({ timestamp: 1000 }), ev({ timestamp: 2000 })]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startIndex).toBe(0);
  });

  it("splits on a long idle gap", () => {
    const chunks = naiveSegment([
      ev({ timestamp: 1000 }), ev({ timestamp: 2000 }),
      ev({ timestamp: 200000 }), // > 60s gap
    ]);
    expect(chunks.map((c) => c.startIndex)).toEqual([0, 2]);
  });
});

describe("buildSegmentationPrompt", () => {
  it("numbers events and asks for JSON", () => {
    const p = buildSegmentationPrompt([ev({ tool: "Write", input: { file_path: "a.cs" } })]);
    expect(p).toContain("0: pre Write");
    expect(p).toContain("JSON array");
  });
});

describe("parseSegmentation", () => {
  it("parses, clamps, orders, and forces the first chunk to 0", () => {
    const out = parseSegmentation('noise [{"startIndex":2,"name":"B","narration":"y"},{"startIndex":0,"name":"A","narration":"x"}] tail', 5);
    expect(out.map((c) => c.startIndex)).toEqual([0, 2]);
    expect(out[0].name).toBe("A");
  });
  it("returns [] on garbage", () => {
    expect(parseSegmentation("not json", 5)).toEqual([]);
    expect(parseSegmentation("[]", 0)).toEqual([]);
  });
});
