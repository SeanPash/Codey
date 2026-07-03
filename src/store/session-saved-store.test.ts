import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSaved, writeSaved } from "./session-saved-store.js";

describe("session-saved-store", () => {
  it("defaults to false when no file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-saved-"));
    expect(readSaved(dir)).toBe(false);
  });

  it("round-trips a saved flag", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-saved-"));
    writeSaved(dir, true);
    expect(readSaved(dir)).toBe(true);
    writeSaved(dir, false);
    expect(readSaved(dir)).toBe(false);
  });

  it("treats a corrupt file as not saved", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-saved-"));
    writeSaved(dir, true);
    writeFileSync(join(dir, "saved.json"), "{ not json");
    expect(readSaved(dir)).toBe(false);
  });
});
