import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendPrompt, readPrompts } from "./prompts.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-prompts-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("prompts log", () => {
  it("returns an empty array when nothing has been recorded", () => {
    expect(readPrompts(dir)).toEqual([]);
  });

  it("appends and reads back prompt timestamps in order", () => {
    appendPrompt(dir, 100);
    appendPrompt(dir, 250);
    expect(readPrompts(dir)).toEqual([100, 250]);
  });

  it("skips a malformed line without throwing", () => {
    appendPrompt(dir, 100);
    appendPrompt(dir, 200);
    expect(readPrompts(dir)).toEqual([100, 200]);
  });
});
