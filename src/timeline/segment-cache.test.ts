import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCache, writeCache, isStale, segmentPlan, mergeSegmentation, type TimelineCache } from "./segment-cache.js";
import type { RawChunk } from "./segment.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const chunks: RawChunk[] = [{ startIndex: 0, name: "Build", narration: "x" }];

describe("segment cache", () => {
  it("round-trips chunks with the event count", () => {
    writeCache("s1", { eventCount: 3, chunks }, dir);
    expect(readCache("s1", dir)).toEqual({ eventCount: 3, chunks });
  });

  it("returns null when no cache exists", () => {
    expect(readCache("missing", dir)).toBeNull();
  });

  it("is stale when there is no cache or the event count grew enough", () => {
    expect(isStale(null, 10)).toBe(true);
    expect(isStale({ eventCount: 10, chunks }, 10)).toBe(false);
    expect(isStale({ eventCount: 10, chunks }, 18)).toBe(false); // within slack
    expect(isStale({ eventCount: 10, chunks }, 21)).toBe(true);  // grew past slack
  });
});

describe("segmentPlan (freeze completed prompts)", () => {
  const cache: TimelineCache = { eventCount: 10, chunks };

  it("segments the whole session once when there is no cache, even when idle", () => {
    expect(segmentPlan(null, 8, false, 5)).toEqual({ refresh: true, lockBefore: 0 });
  });

  it("does nothing for an empty session", () => {
    expect(segmentPlan(null, 0, true, 0)).toEqual({ refresh: false, lockBefore: 0 });
  });

  it("never re-segments an idle session that already has a cache (fully frozen)", () => {
    expect(segmentPlan(cache, 30, false, 12).refresh).toBe(false);
  });

  it("re-segments only the live turn, locking everything before it", () => {
    const plan = segmentPlan(cache, 30, true, 12); // grew past slack, live
    expect(plan).toEqual({ refresh: true, lockBefore: 12 });
  });

  it("does not re-segment a live session that is not yet stale", () => {
    expect(segmentPlan(cache, 18, true, 11, 1_000_000).refresh).toBe(false); // only 8 new, within slack
  });

  it("holds off a live re-segment while inside the time floor", () => {
    const now = 1_000_000;
    const fresh: TimelineCache = { eventCount: 10, chunks, segmentedAt: now - 5_000 };
    // Stale by event count and live, but the last pass was only 5s ago: wait.
    expect(segmentPlan(fresh, 40, true, 12, now).refresh).toBe(false);
  });

  it("allows a live re-segment once the time floor has passed", () => {
    const now = 1_000_000;
    const old: TimelineCache = { eventCount: 10, chunks, segmentedAt: now - 20_000 };
    expect(segmentPlan(old, 40, true, 12, now)).toEqual({ refresh: true, lockBefore: 12 });
  });

  it("treats a cache with no segmentedAt as past the floor (back-compat)", () => {
    expect(segmentPlan(cache, 40, true, 12, 1_000_000).refresh).toBe(true);
  });
});

describe("mergeSegmentation", () => {
  it("keeps frozen head chunks and shifts the freshly segmented tail onto the full list", () => {
    const prev: RawChunk[] = [
      { startIndex: 0, name: "First prompt", narration: "a" },
      { startIndex: 3, name: "Still first", narration: "b" },
    ];
    // Tail was segmented from events.slice(6), so its indices are slice-relative.
    const tail: RawChunk[] = [
      { startIndex: 0, name: "Live task", narration: "c" },
      { startIndex: 2, name: "Live task 2", narration: "d" },
    ];
    expect(mergeSegmentation(prev, tail, 6)).toEqual([
      { startIndex: 0, name: "First prompt", narration: "a" },
      { startIndex: 3, name: "Still first", narration: "b" },
      { startIndex: 6, name: "Live task", narration: "c" },
      { startIndex: 8, name: "Live task 2", narration: "d" },
    ]);
  });

  it("drops frozen chunks that fall at or past the lock and always starts at index 0", () => {
    const prev: RawChunk[] = [{ startIndex: 0, name: "Old", narration: "a" }, { startIndex: 7, name: "Stale", narration: "b" }];
    const tail: RawChunk[] = [{ startIndex: 0, name: "Fresh", narration: "c" }];
    expect(mergeSegmentation(prev, tail, 4)).toEqual([
      { startIndex: 0, name: "Old", narration: "a" },
      { startIndex: 4, name: "Fresh", narration: "c" },
    ]);
  });
});
