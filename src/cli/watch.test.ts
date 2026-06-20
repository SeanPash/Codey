import { describe, it, expect } from "vitest";
import { processTick, createWatchState } from "./watch.js";
import type { ToolEvent } from "../types.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "T", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}

describe("processTick action line", () => {
  it("emits the tagged action once and not again until it changes", async () => {
    const state = createWatchState("simple", async () => null);
    const a = ev({ id: "0", tool: "Edit", input: { file_path: "/x/auth.ts" }, inputHash: "h0" });
    const first = await processTick([a], state, 100);
    expect(first.lines.some((l) => l.includes("[editing]") && l.includes("auth.ts"))).toBe(true);

    const second = await processTick([a], state, 200);
    expect(second.lines.some((l) => l.includes("[editing]"))).toBe(false); // same action, deduped
  });
});

describe("processTick", () => {
  it("emits a loop warning once and not again for the same run", async () => {
    const state = createWatchState("simple", async () => null);
    const events = Array.from({ length: 6 }, (_, i) =>
      ev({ id: String(i), inputHash: "same", timestamp: i }));

    const first = await processTick(events, state, 100);
    expect(first.lines.some((l) => l.includes("⚠️"))).toBe(true);

    const second = await processTick(events, state, 200);
    expect(second.lines.some((l) => l.includes("⚠️"))).toBe(false); // dedup same warning
  });

  it("emits narration text returned by the engine", async () => {
    const state = createWatchState("deep", async () => "Claude is doing X.");
    const events = [ev({ id: "0" }), ev({ id: "1" })];
    const tick = await processTick(events, state, 100);
    expect(tick.lines.some((l) => l.includes("Claude is doing X."))).toBe(true);
  });
});
