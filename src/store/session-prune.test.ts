import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pruneEventless } from "./session-prune.js";

function makeRoot(): string {
  const root = join(tmpdir(), `codey-prune-test-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  return root;
}

describe("pruneEventless", () => {
  let root: string;

  beforeEach(() => { root = makeRoot(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("removes old event-less dirs, keeps real sessions and fresh phantoms", () => {
    const now = Date.now();
    const twoHoursAgo = new Date((now - 2 * 60 * 60 * 1000) / 1000);

    // oldPhantom: no events.jsonl, mtime ~2h ago
    const oldPhantom = join(root, "oldPhantom");
    mkdirSync(oldPhantom);
    const oldFile = join(oldPhantom, "prompts.jsonl");
    writeFileSync(oldFile, "");
    utimesSync(oldFile, twoHoursAgo, twoHoursAgo);
    utimesSync(oldPhantom, twoHoursAgo, twoHoursAgo);

    // real: has events.jsonl, should always be kept
    const real = join(root, "real");
    mkdirSync(real);
    writeFileSync(join(real, "events.jsonl"), "{}");

    // freshPhantom: no events.jsonl, mtime is now
    const freshPhantom = join(root, "freshPhantom");
    mkdirSync(freshPhantom);

    const maxAgeMs = 30 * 60_000; // 30 minutes
    const removed = pruneEventless(root, now, maxAgeMs);

    expect(removed).toContain("oldPhantom");
    expect(removed).not.toContain("real");
    expect(removed).not.toContain("freshPhantom");

    expect(existsSync(oldPhantom)).toBe(false);
    expect(existsSync(real)).toBe(true);
    expect(existsSync(freshPhantom)).toBe(true);
  });

  it("returns empty array when root does not exist", () => {
    const missing = join(tmpdir(), "codey-no-such-root-xyzzy");
    expect(pruneEventless(missing, Date.now(), 30 * 60_000)).toEqual([]);
  });
});
