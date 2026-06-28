import { describe, it, expect } from "vitest";
import type { ToolEvent } from "../types.js";
import {
  shouldNarrate,
  toolFamily,
  naiveBoundaryCrossed,
  toolFamilyChanged,
  longToolFinished,
  CADENCE,
} from "./cadence.js";

let seq = 0;
function pre(tool: string, ts: number, inputHash = "h"): ToolEvent {
  return { id: String(seq++), phase: "pre", tool, server: null, input: {}, inputHash,
    isError: false, errorText: null, timestamp: ts, sessionId: "s" };
}
function post(tool: string, ts: number, isError = false): ToolEvent {
  return { id: String(seq++), phase: "post", tool, server: null, input: undefined, inputHash: "h",
    isError, errorText: isError ? "boom" : null, timestamp: ts, sessionId: "s" };
}

// Three reads then two edits, spaced tightly so nothing idle-splits.
const READ_THEN_EDIT = [pre("Read", 0), pre("Read", 100), pre("Read", 200), pre("Edit", 300), pre("Edit", 400)];

describe("toolFamily", () => {
  it("groups tools into families", () => {
    expect(toolFamily("Edit")).toBe("edit");
    expect(toolFamily("Write")).toBe("edit");
    expect(toolFamily("Read")).toBe("read");
    expect(toolFamily("Grep")).toBe("search");
    expect(toolFamily("Bash")).toBe("run");
    expect(toolFamily("Task")).toBe("task");
    expect(toolFamily("mcp__unity__foo")).toBe("other");
  });
});

describe("naiveBoundaryCrossed", () => {
  it("is true when a new chunk starts at or after the narrated point", () => {
    // narrated through the reads; the edit run is a new task boundary
    expect(naiveBoundaryCrossed(READ_THEN_EDIT, 2)).toBe(true);
  });
  it("is false when no new chunk has started since the narrated point", () => {
    expect(naiveBoundaryCrossed(READ_THEN_EDIT, 5)).toBe(false);
  });
  it("does not count the very first chunk as a boundary", () => {
    expect(naiveBoundaryCrossed([pre("Read", 0), pre("Read", 100)], 0)).toBe(false);
  });
});

describe("toolFamilyChanged", () => {
  it("is true when the active family differs from the last narrated family", () => {
    const events = [pre("Read", 0), pre("Read", 100), pre("Bash", 200)];
    expect(toolFamilyChanged(events, 2)).toBe(true);
  });
  it("is false when the family is unchanged since the narrated point", () => {
    const events = [pre("Read", 0), pre("Bash", 100), pre("Bash", 200)];
    expect(toolFamilyChanged(events, 2)).toBe(false);
  });
});

describe("longToolFinished", () => {
  it("is true when a tool that ran longer than the threshold just finished", () => {
    const events = [pre("Bash", 0), post("Bash", 9000)];
    expect(longToolFinished(events, 0, 8000)).toBe(true);
  });
  it("is false for a quick tool", () => {
    const events = [pre("Bash", 0), post("Bash", 1000)];
    expect(longToolFinished(events, 0, 8000)).toBe(false);
  });
  it("only counts a finish inside the unnarrated window", () => {
    const events = [pre("Bash", 0), post("Bash", 9000)];
    expect(longToolFinished(events, 2, 8000)).toBe(false);
  });
});

describe("shouldNarrate", () => {
  const base = { events: READ_THEN_EDIT, lastNarratedIndex: 0, lastCallAt: 0, now: 1_000_000, warningActive: false };

  it("does not fire when there is no unnarrated work", () => {
    const r = shouldNarrate("deep", { ...base, lastNarratedIndex: READ_THEN_EDIT.length, lastCallAt: 1 });
    expect(r.fire).toBe(false);
  });

  it("never fires within the floor, even with a salient signal", () => {
    // deep floor is 25s; only 10s since the last call
    const now = 1_000_000;
    const r = shouldNarrate("deep", {
      ...base, lastNarratedIndex: 2, lastCallAt: now - 10_000, now, warningActive: true,
    });
    expect(r.fire).toBe(false);
  });

  it("fires on an active warning once past the floor", () => {
    const now = 1_000_000;
    const r = shouldNarrate("deep", {
      ...base, lastNarratedIndex: 2, lastCallAt: now - 30_000, now, warningActive: true,
    });
    expect(r).toEqual({ fire: true, reason: "warning" });
  });

  it("fires on a task boundary once past the floor", () => {
    const now = 1_000_000;
    const r = shouldNarrate("deep", {
      ...base, lastNarratedIndex: 2, lastCallAt: now - 30_000, now,
    });
    expect(r).toEqual({ fire: true, reason: "task" });
  });

  it("fires on the time cap when work is quiet (no salient signal)", () => {
    const now = 1_000_000;
    // a single continuing read run: no boundary, no family change, no long tool
    const reads = [pre("Read", 0), pre("Read", 100), pre("Read", 200)];
    const r = shouldNarrate("deep", {
      events: reads, lastNarratedIndex: 1, lastCallAt: now - 50_000, now, warningActive: false,
    });
    expect(r).toEqual({ fire: true, reason: "cap" });
  });

  it("fires immediately on the first call when there is work", () => {
    const reads = [pre("Read", 0), pre("Read", 100)];
    const r = shouldNarrate("deep", { events: reads, lastNarratedIndex: 0, lastCallAt: 0, now: 1_000_000, warningActive: false });
    expect(r.fire).toBe(true);
  });

  it("applies the per-mode floor: simple holds where deep would fire", () => {
    const now = 1_000_000;
    const input = { ...base, lastNarratedIndex: 2, lastCallAt: now - 40_000, now };
    // 40s since last call: past deep's 25s floor (fires on the task boundary), under simple's 45s floor
    expect(shouldNarrate("deep", input).fire).toBe(true);
    expect(shouldNarrate("simple", input).fire).toBe(false);
  });

  it("exposes the configured thresholds", () => {
    expect(CADENCE.simple).toEqual({ floorMs: 45_000, capMs: 75_000 });
    expect(CADENCE.deep).toEqual({ floorMs: 25_000, capMs: 45_000 });
    expect(CADENCE.teach).toEqual({ floorMs: 30_000, capMs: 50_000 });
  });
});
