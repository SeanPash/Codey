import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { narrateTick } from "./narrate.js";
import { readStatus } from "../statusline/state.js";
import { createWatchState } from "./watch.js";
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
});
