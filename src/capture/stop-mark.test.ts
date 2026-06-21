import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleStopInput } from "./stop-mark.js";
import { readStatus } from "../statusline/state.js";

describe("handleStopInput", () => {
  it("stamps doneAt on the session snapshot when Claude finishes a turn", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-stop-"));
    handleStopInput(JSON.stringify({ session_id: "s1", hook_event_name: "Stop" }), 4242, root);
    expect(readStatus(join(root, "s1"))?.doneAt).toBe(4242);
  });

  it("ignores input with no session id", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-stop-"));
    expect(() => handleStopInput(JSON.stringify({ hook_event_name: "Stop" }), 1, root)).not.toThrow();
  });

  it("ignores malformed json without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-stop-"));
    expect(() => handleStopInput("{not json", 1, root)).not.toThrow();
  });
});
