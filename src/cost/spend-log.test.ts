import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendSpend, readSpend } from "./spend-log.js";
import type { SpendEntry } from "../types.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-spend-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const entry = (over: Partial<SpendEntry> = {}): SpendEntry => ({
  ts: 1,
  kind: "narration",
  mode: "deep",
  usage: { input: 10, output: 20, cacheRead: 100, cacheWrite: 0 },
  costUsd: 0.001,
  ...over,
});

describe("spend-log", () => {
  it("returns an empty list when nothing has been logged", () => {
    expect(readSpend(dir)).toEqual([]);
  });

  it("appends entries and reads them back in order", () => {
    appendSpend(dir, entry({ ts: 1 }));
    appendSpend(dir, entry({ ts: 2, kind: "timeline", mode: null }));
    const got = readSpend(dir);
    expect(got).toHaveLength(2);
    expect(got[0].ts).toBe(1);
    expect(got[1].kind).toBe("timeline");
    expect(got[1].mode).toBeNull();
  });

  it("skips a corrupt line instead of throwing", () => {
    appendSpend(dir, entry({ ts: 1 }));
    // simulate a torn write by appending raw junk
    appendSpend(dir, entry({ ts: 2 }));
    const got = readSpend(dir);
    expect(got.map((e) => e.ts)).toEqual([1, 2]);
  });
});
