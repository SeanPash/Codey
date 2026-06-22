import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCustomName, writeCustomName } from "./session-name-store.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "codey-name-store-test-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("readCustomName", () => {
  it("returns null when name.json does not exist", () => {
    expect(readCustomName(tmp)).toBeNull();
  });

  it("returns the name after a round-trip write then read", () => {
    writeCustomName(tmp, "My custom session");
    expect(readCustomName(tmp)).toBe("My custom session");
  });

  it("trims surrounding whitespace from stored name", () => {
    writeCustomName(tmp, "  trimmed  ");
    expect(readCustomName(tmp)).toBe("trimmed");
  });
});

describe("writeCustomName", () => {
  it("writing whitespace-only clears the name (readCustomName returns null)", () => {
    writeCustomName(tmp, "first name");
    writeCustomName(tmp, "   ");
    expect(readCustomName(tmp)).toBeNull();
  });

  it("writing empty string clears the name", () => {
    writeCustomName(tmp, "first name");
    writeCustomName(tmp, "");
    expect(readCustomName(tmp)).toBeNull();
  });

  it("creates the dir if it does not exist", () => {
    const nested = join(tmp, "newdir", "session-id");
    writeCustomName(nested, "hello");
    expect(readCustomName(nested)).toBe("hello");
  });
});
