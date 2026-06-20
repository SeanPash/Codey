import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCache, writeCache, isStale } from "./segment-cache.js";
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
    expect(isStale({ eventCount: 10, chunks }, 11)).toBe(false); // within slack
    expect(isStale({ eventCount: 10, chunks }, 16)).toBe(true);  // grew past slack
  });
});
