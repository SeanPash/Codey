import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readExplanation, writeExplanation } from "./explain-cache.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "codey-explain-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("explain-cache", () => {
  it("round-trips a stored explanation", () => {
    writeExplanation("s1", "task", "c0", "hashA", "deep", "Because reasons.", root);
    expect(readExplanation("s1", "task", "c0", "hashA", "deep", root)).toBe("Because reasons.");
  });

  it("misses when nothing is stored", () => {
    expect(readExplanation("s1", "task", "c0", "hashA", "deep", root)).toBeNull();
  });

  it("keeps depths separate", () => {
    writeExplanation("s1", "task", "c0", "hashA", "deep", "deep text", root);
    expect(readExplanation("s1", "task", "c0", "hashA", "simple", root)).toBeNull();
    expect(readExplanation("s1", "task", "c0", "hashA", "deep", root)).toBe("deep text");
  });

  it("invalidates when the content hash changes", () => {
    writeExplanation("s1", "task", "c0", "hashA", "deep", "old", root);
    expect(readExplanation("s1", "task", "c0", "hashB", "deep", root)).toBeNull();
  });

  it("prunes a stale hash for the same scope and id on write", () => {
    writeExplanation("s1", "task", "c0", "hashA", "deep", "old", root);
    writeExplanation("s1", "task", "c0", "hashB", "deep", "new", root);
    expect(readExplanation("s1", "task", "c0", "hashA", "deep", root)).toBeNull();
    expect(readExplanation("s1", "task", "c0", "hashB", "deep", root)).toBe("new");
  });

  it("isolates ids and scopes", () => {
    writeExplanation("s1", "task", "c0", "h", "deep", "task text", root);
    writeExplanation("s1", "action", "c0", "h", "deep", "action text", root);
    expect(readExplanation("s1", "task", "c0", "h", "deep", root)).toBe("task text");
    expect(readExplanation("s1", "action", "c0", "h", "deep", root)).toBe("action text");
    expect(readExplanation("s1", "task", "c1", "h", "deep", root)).toBeNull();
  });
});
