import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeActiveMode, readActiveMode, clearActiveMode } from "./active-mode.js";

describe("active mode store", () => {
  it("round-trips the chosen mode", () => {
    const home = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeActiveMode("deep", home);
    expect(readActiveMode(home)).toBe("deep");
  });

  it("reads null when no mode is set, so the line stays off by default", () => {
    const home = mkdtempSync(join(tmpdir(), "codey-mode-"));
    expect(readActiveMode(home)).toBeNull();
  });

  it("clears back to off", () => {
    const home = mkdtempSync(join(tmpdir(), "codey-mode-"));
    writeActiveMode("teach", home);
    clearActiveMode(home);
    expect(readActiveMode(home)).toBeNull();
  });
});
