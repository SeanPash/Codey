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

  it("names a chunk in plain English instead of 'Working'", () => {
    const chunks = naiveSegment([ev({ tool: "Read", input: { file_path: "a.ts" }, timestamp: 1000 })]);
    expect(chunks[0].name).not.toBe("Working");
    expect(chunks[0].narration).toMatch(/Claude is/);
  });

  it("narrates a collapsed card with the deeper grounded sentence, naming real files", () => {
    const chunks = naiveSegment([
      ev({ tool: "Read", input: { file_path: "compose.ts" }, timestamp: 1000 }),
      ev({ tool: "Read", input: { file_path: "render.ts" }, timestamp: 1100 }),
      ev({ tool: "Read", input: { file_path: "segment.ts" }, timestamp: 1200 }),
    ]);
    expect(chunks[0].narration).toMatch(/compose\.ts/);
    expect(chunks[0].narration).toMatch(/render\.ts/);
    // Deep wording carries the relationship, not just "Claude is reading ...".
    expect(chunks[0].narration).toMatch(/to trace how they work together/);
    expect(chunks[0].narration).not.toMatch(/several files|see how the pieces fit together|map how they connect/i);
  });

  it("splits when the work phase changes", () => {
    const chunks = naiveSegment([
      ev({ tool: "Read", input: { file_path: "a.ts" }, timestamp: 1000 }),
      ev({ tool: "Edit", input: { file_path: "a.ts" }, timestamp: 2000 }),
    ]);
    expect(chunks.map((c) => c.startIndex)).toEqual([0, 1]);
  });

  it("splits on a long idle gap", () => {
    const chunks = naiveSegment([
      ev({ timestamp: 1000 }), ev({ timestamp: 2000 }),
      ev({ timestamp: 200000 }), // a long pause, a fresh task
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

  it("feeds Claude's description and the command's real purpose for shell events", () => {
    const p = buildSegmentationPrompt([
      ev({ tool: "Bash", input: { command: "npm run build", description: "Rebuild the plugin" } }),
    ]);
    expect(p).toMatch(/Rebuild the plugin/);
    expect(p).toMatch(/build|rebuild/i);
  });

  it("tells the model to name purposes, not tools, with no em dashes", () => {
    const p = buildSegmentationPrompt([ev({ tool: "Read", input: { file_path: "a.ts" } })]);
    expect(p).toMatch(/purpose/i);
    expect(p).not.toContain("—");
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
