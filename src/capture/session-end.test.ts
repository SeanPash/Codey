import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleSessionEndInput } from "./session-end.js";
import { readStatus } from "../statusline/state.js";

describe("handleSessionEndInput", () => {
  it("stamps closedAt when the session ends", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-end-"));
    handleSessionEndInput(JSON.stringify({ session_id: "s1", hook_event_name: "SessionEnd" }), 7777, root);
    expect(readStatus(join(root, "s1"))?.closedAt).toBe(7777);
  });

  it("ignores input with no session id", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-end-"));
    expect(() => handleSessionEndInput(JSON.stringify({ hook_event_name: "SessionEnd" }), 1, root)).not.toThrow();
  });

  it("ignores malformed json without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-end-"));
    expect(() => handleSessionEndInput("{nope", 1, root)).not.toThrow();
  });
});
