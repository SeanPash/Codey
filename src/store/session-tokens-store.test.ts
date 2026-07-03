import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTokens, writeTokens } from "./session-tokens-store.js";

describe("session-tokens-store", () => {
  it("defaults to 0 when no file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-tok-"));
    expect(readTokens(dir)).toBe(0);
  });

  it("round-trips a token total", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-tok-"));
    writeTokens(dir, 12345);
    expect(readTokens(dir)).toBe(12345);
  });

  it("treats a corrupt or non-numeric file as 0", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-tok-"));
    writeFileSync(join(dir, "tokens.json"), "{ not json");
    expect(readTokens(dir)).toBe(0);
  });
});
