import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handlePromptInput } from "./prompt-mark.js";
import { readStatus } from "../statusline/state.js";

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
});
