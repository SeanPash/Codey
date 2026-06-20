import { describe, it, expect } from "vitest";
import { computeOpenCalls } from "./open-calls.js";
import type { ToolEvent } from "../types.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}

describe("computeOpenCalls", () => {
  it("returns pre events with no matching post", () => {
    const open = computeOpenCalls([
      ev({ id: "a", phase: "pre", tool: "Read", timestamp: 1 }),
      ev({ id: "b", phase: "pre", tool: "Bash", timestamp: 2 }),
      ev({ id: "c", phase: "post", tool: "Read", timestamp: 3 }),
    ]);
    expect(open.map((e) => e.id)).toEqual(["b"]);
  });

  it("pairs posts to the oldest open pre of the same tool (FIFO)", () => {
    const open = computeOpenCalls([
      ev({ id: "a", phase: "pre", tool: "Read", timestamp: 1 }),
      ev({ id: "b", phase: "pre", tool: "Read", timestamp: 2 }),
      ev({ id: "c", phase: "post", tool: "Read", timestamp: 3 }),
    ]);
    expect(open.map((e) => e.id)).toEqual(["b"]);
  });
});
