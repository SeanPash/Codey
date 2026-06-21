import { describe, it, expect } from "vitest";
import { detectLoop, detectRepeatError, detectHang } from "./detectors.js";
import { hangThreshold } from "./hang-config.js";
import type { ToolEvent } from "../types.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}

describe("detectLoop", () => {
  it("warns when the same tool+inputHash repeats >= threshold consecutively", () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      ev({ id: String(i), phase: "pre", tool: "T", inputHash: "same", timestamp: i }));
    const w = detectLoop(events, 6);
    expect(w?.kind).toBe("loop");
    expect(w?.count).toBe(6);
    expect(w?.tool).toBe("T");
  });

  it("does not warn below threshold", () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      ev({ id: String(i), phase: "pre", inputHash: "same", timestamp: i }));
    expect(detectLoop(events, 6)).toBeNull();
  });

  it("resets the run when the input changes", () => {
    const events = [
      ev({ inputHash: "a", timestamp: 1 }), ev({ inputHash: "a", timestamp: 2 }),
      ev({ inputHash: "b", timestamp: 3 }), ev({ inputHash: "a", timestamp: 4 }),
    ];
    expect(detectLoop(events, 3)).toBeNull();
  });
});

describe("detectRepeatError", () => {
  it("warns when the same tool errors with the same text >= threshold", () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      ev({ phase: "post", tool: "T", isError: true, errorText: "boom", timestamp: i }));
    const w = detectRepeatError(events, 3);
    expect(w?.kind).toBe("repeat_error");
    expect(w?.count).toBe(3);
  });

  it("ignores successful posts", () => {
    const events = [ev({ phase: "post", isError: false, timestamp: 1 })];
    expect(detectRepeatError(events, 1)).toBeNull();
  });
});

describe("detectHang", () => {
  it("warns when an open call is older than the threshold", () => {
    const open = [ev({ id: "a", phase: "pre", tool: "Bash", timestamp: 1000 })];
    const w = detectHang(open, 46_000, () => 45_000);
    expect(w?.kind).toBe("hang");
    expect(w?.tool).toBe("Bash");
    expect(w?.count).toBe(45); // seconds elapsed
  });

  it("does not warn when nothing has exceeded the threshold", () => {
    const open = [ev({ phase: "pre", timestamp: 1000 })];
    expect(detectHang(open, 2000, () => 45_000)).toBeNull();
  });

  it("uses the per-tool threshold so a slow shell is tolerated but a slow read is not", () => {
    const now = 200_000; // both calls below are 100s old
    const slowRead = [ev({ id: "r", phase: "pre", tool: "Read", timestamp: 100_000 })];
    const slowBash = [ev({ id: "b", phase: "pre", tool: "Bash", timestamp: 100_000 })];
    expect(detectHang(slowRead, now, hangThreshold)?.tool).toBe("Read"); // 100s past the 45s read leash
    expect(detectHang(slowBash, now, hangThreshold)).toBeNull();         // 100s still under the 180s shell leash
  });
});
