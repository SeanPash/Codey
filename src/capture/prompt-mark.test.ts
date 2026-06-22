import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handlePromptInput } from "./prompt-mark.js";
import { readStatus } from "../statusline/state.js";
import { readPrompts } from "./prompts.js";

describe("handlePromptInput", () => {
  it("stamps promptAt on the session snapshot", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    handlePromptInput(JSON.stringify({ session_id: "s1", hook_event_name: "UserPromptSubmit" }), 1234, root);
    expect(readStatus(join(root, "s1"))?.promptAt).toBe(1234);
  });

  it("ignores input with no session id", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    expect(() => handlePromptInput(JSON.stringify({ hook_event_name: "UserPromptSubmit" }), 1, root)).not.toThrow();
  });

  it("ignores malformed json without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    expect(() => handlePromptInput("{not json", 1, root)).not.toThrow();
  });

  it("appends the prompt timestamp to the prompts log", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    handlePromptInput(JSON.stringify({ session_id: "s1", hook_event_name: "UserPromptSubmit" }), 4242, root);
    expect(readPrompts(join(root, "s1"))).toEqual([4242]);
  });

  it("creates no folder for Codey's own headless narration (CODEY_HEADLESS set)", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    const prev = process.env.CODEY_HEADLESS;
    process.env.CODEY_HEADLESS = "1";
    try {
      handlePromptInput(JSON.stringify({ session_id: "headless1", hook_event_name: "UserPromptSubmit" }), 1, root);
      expect(existsSync(join(root, "headless1"))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.CODEY_HEADLESS; else process.env.CODEY_HEADLESS = prev;
    }
  });
});
