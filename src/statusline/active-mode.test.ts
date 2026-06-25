import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSessionMode, readSessionMode, clearSessionMode, anyActiveSession } from "./active-mode.js";

describe("per-session mode store", () => {
  it("round-trips the chosen mode for a session", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeSessionMode("deep", dir);
    expect(readSessionMode(dir)).toBe("deep");
  });

  it("reads null when the session has no mode, so a new tab stays off", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-mode-"));
    expect(readSessionMode(dir)).toBeNull();
  });

  it("clears back to off", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeSessionMode("teach", dir);
    clearSessionMode(dir);
    expect(readSessionMode(dir)).toBeNull();
  });

  it("writes and reads back deep", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeSessionMode("deep", dir);
    expect(readSessionMode(dir)).toBe("deep");
  });
});

describe("anyActiveSession", () => {
  it("is true while at least one session is on, false once all are off", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    const a = join(root, "a");
    const b = join(root, "b");
    mkdirSync(a);
    mkdirSync(b);
    expect(anyActiveSession(root)).toBe(false);
    writeSessionMode("simple", a);
    expect(anyActiveSession(root)).toBe(true);
    clearSessionMode(a);
    expect(anyActiveSession(root)).toBe(false);
  });
});
