import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handlePromptInput } from "./prompt-mark.js";
import { readStatus } from "../statusline/state.js";
import { readPrompts } from "./prompts.js";
import { readMeta, writeMetaIfAbsent } from "../store/session-meta.js";
import { readSessionMode, writeSessionMode } from "../statusline/active-mode.js";

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

  it("records the transcript path and cwd so a tool-less turn still has a name", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    handlePromptInput(
      JSON.stringify({ session_id: "s1", hook_event_name: "UserPromptSubmit", transcript_path: "/t/s1.jsonl", cwd: "/proj" }),
      1, root,
    );
    expect(readMeta("s1", root)).toEqual({ sessionId: "s1", transcriptPath: "/t/s1.jsonl", cwd: "/proj" });
  });

  it("does not carry a prior same-cwd session's mode onto a fresh session", () => {
    // /clear and resume start a new session id in the same folder. Codey must stay off there
    // until the user opts back in, so viewing the timeline or any first prompt never lights it up.
    const root = mkdtempSync(join(tmpdir(), "codey-prompt-"));
    writeMetaIfAbsent({ sessionId: "old", transcriptPath: null, cwd: "/proj" }, root);
    writeSessionMode("deep", join(root, "old"));
    handlePromptInput(
      JSON.stringify({ session_id: "new", hook_event_name: "UserPromptSubmit", cwd: "/proj" }), 1, root,
    );
    expect(readSessionMode(join(root, "new"))).toBeNull();
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
