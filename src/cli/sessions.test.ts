import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestSessionId } from "./sessions.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("latestSessionId", () => {
  it("returns null when there are no sessions", () => {
    expect(latestSessionId(dir)).toBeNull();
  });

  it("returns the most recently created session directory", () => {
    mkdirSync(join(dir, "old"));
    mkdirSync(join(dir, "new"));
    expect(["old", "new"]).toContain(latestSessionId(dir));
    expect(latestSessionId(dir)).toBe("new");
  });
});
