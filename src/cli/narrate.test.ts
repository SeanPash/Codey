import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrateTick, makeBudgetedNarrate } from "./narrate.js";
import { readStatus } from "../statusline/state.js";
import { createWatchState } from "./watch.js";
import { readWhys } from "../narration/history.js";
import type { ToolEvent } from "../types.js";

function evt(i: number): ToolEvent {
  return { id: String(i), phase: "pre", tool: "Edit", server: null, input: { file_path: `/x/file${i}.ts` }, inputHash: `h${i}`, isError: false, errorText: null, timestamp: i, sessionId: "s" };
}

describe("narrateTick", () => {
  it("writes the narrator's why into the snapshot", async () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-"));
    const state = createWatchState("deep", async () => "adding validation");
    const events = [0, 1, 2, 3, 4].map(evt);
    const now = 1000; // within the hang threshold of the event timestamps, so no warning fires
    await narrateTick(dir, events, state, now);
    expect(readStatus(dir)?.why).toBe("adding validation");
    expect(readStatus(dir)?.warning).toBeNull();
    rmSync(dir, { recursive: true, force: true });
  });

  it("appends the produced why to the narration history", async () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-narr-"));
    const state = createWatchState("deep", async () => "because reasons");
    const events = [0, 1, 2, 3, 4].map(evt); // enough new events for deep mode to narrate
    await narrateTick(dir, events, state, 1234);
    expect(readWhys(dir)).toEqual([{ ts: 1234, why: "because reasons" }]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("makeBudgetedNarrate", () => {
  it("skips the call and returns null when the budget is exhausted", async () => {
    const meter = vi.fn();
    const fn = makeBudgetedNarrate(
      () => ({ cap: 100, spent: 100 }),
      async () => ({ text: "why", tokens: 10, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }),
      meter,
    );
    expect(await fn("prompt")).toBeNull();
    expect(meter).not.toHaveBeenCalled();
  });

  it("calls through and records spend when under budget", async () => {
    const meter = vi.fn();
    const fn = makeBudgetedNarrate(
      () => ({ cap: 100, spent: 0 }),
      async () => ({ text: "why", tokens: 10, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }),
      meter,
    );
    expect(await fn("prompt")).toBe("why");
    expect(meter).toHaveBeenCalledWith(10);
  });

  it("uncapped sessions narrate and still record spend (no-op meter)", async () => {
    const meter = vi.fn();
    const fn = makeBudgetedNarrate(
      () => null,
      async () => ({ text: "why", tokens: 7, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }),
      meter,
    );
    expect(await fn("prompt")).toBe("why");
    expect(meter).toHaveBeenCalledWith(7);
  });
});
