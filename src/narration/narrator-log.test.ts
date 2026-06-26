import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logNarrator, describeExecError } from "./narrator-log.js";

describe("logNarrator", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("appends timestamped lines to narrator.log", () => {
    logNarrator(dir, "narrator started");
    logNarrator(dir, "narration ok");
    const text = readFileSync(join(dir, "narrator.log"), "utf8").trim().split("\n");
    expect(text).toHaveLength(2);
    expect(text[0]).toMatch(/narrator started$/);
    expect(text[1]).toMatch(/narration ok$/);
  });

  it("never throws when the directory is missing", () => {
    expect(() => logNarrator(join(dir, "gone"), "x")).not.toThrow();
    expect(existsSync(join(dir, "gone", "narrator.log"))).toBe(false);
  });
});

describe("describeExecError", () => {
  it("names a missing claude binary", () => {
    expect(describeExecError({ code: "ENOENT" })).toBe("claude not found on PATH");
  });

  it("names a timeout", () => {
    expect(describeExecError({ killed: true, signal: "SIGTERM" })).toMatch(/timed out/);
  });

  it("reports a non-zero exit with any stderr tail", () => {
    expect(describeExecError({ code: 1 }, "auth failed\nmore")).toBe("exit 1; auth failed");
  });

  it("falls back to the first message line", () => {
    expect(describeExecError({ message: "spawn boom\nstack" })).toBe("spawn boom");
  });

  it("handles a null error as a usable-result failure", () => {
    expect(describeExecError(null)).toBe("claude returned no usable result");
  });
});
