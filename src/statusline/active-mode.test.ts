import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSessionMode, readSessionMode, clearSessionMode, anyActiveSession, inheritedMode } from "./active-mode.js";
import { writeMetaIfAbsent } from "../store/session-meta.js";

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

  it("writes and reads back ask", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeSessionMode("ask", dir);
    expect(readSessionMode(dir)).toBe("ask");
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

describe("inheritedMode", () => {
  it("carries the mode from a prior same-cwd session forward", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    writeMetaIfAbsent({ sessionId: "old", transcriptPath: null, cwd: "/proj" }, root);
    writeSessionMode("deep", join(root, "old"));
    expect(inheritedMode("/proj", "new", root)).toBe("deep");
  });

  it("returns null when no prior session shares the cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    writeMetaIfAbsent({ sessionId: "old", transcriptPath: null, cwd: "/other" }, root);
    writeSessionMode("deep", join(root, "old"));
    expect(inheritedMode("/proj", "new", root)).toBeNull();
  });

  it("ignores prior sessions in the same cwd that have Codey off", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    writeMetaIfAbsent({ sessionId: "old", transcriptPath: null, cwd: "/proj" }, root);
    expect(inheritedMode("/proj", "new", root)).toBeNull();
  });

  it("never inherits from the session itself", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    writeMetaIfAbsent({ sessionId: "self", transcriptPath: null, cwd: "/proj" }, root);
    writeSessionMode("teach", join(root, "self"));
    expect(inheritedMode("/proj", "self", root)).toBeNull();
  });

  it("returns null for an unknown cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    expect(inheritedMode(null, "new", root)).toBeNull();
  });

  it("picks the most recently active session when several share the cwd", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-root-"));
    writeMetaIfAbsent({ sessionId: "older", transcriptPath: null, cwd: "/proj" }, root);
    writeSessionMode("simple", join(root, "older"));
    writeMetaIfAbsent({ sessionId: "newer", transcriptPath: null, cwd: "/proj" }, root);
    writeSessionMode("teach", join(root, "newer"));
    // newer's mode file was written last, so it is the most recent Codey activity in /proj.
    expect(inheritedMode("/proj", "new", root)).toBe("teach");
  });
});
