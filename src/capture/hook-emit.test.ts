import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleHookInput } from "./hook-emit.js";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("handleHookInput", () => {
  it("parses raw JSON and appends a normalized event", () => {
    handleHookInput(
      JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { path: "x" }, session_id: "s1" }),
      dir,
    );
    const events = new SessionStore("s1", dir).readAll();
    expect(events).toHaveLength(1);
    expect(events[0].tool).toBe("Read");
    expect(events[0].phase).toBe("pre");
  });

  it("ignores empty or unparseable input without throwing", () => {
    expect(() => handleHookInput("", dir)).not.toThrow();
    expect(() => handleHookInput("not json", dir)).not.toThrow();
  });

  it("skips capture for Codey's own headless narration (CODEY_HEADLESS set)", () => {
    const prev = process.env.CODEY_HEADLESS;
    process.env.CODEY_HEADLESS = "1";
    try {
      handleHookInput(
        JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { path: "x" }, session_id: "headless1" }),
        dir,
      );
      expect(new SessionStore("headless1", dir).readAll()).toHaveLength(0);
    } finally {
      if (prev === undefined) delete process.env.CODEY_HEADLESS; else process.env.CODEY_HEADLESS = prev;
    }
  });

  it("writes a meta.json with the transcript path on the first event", () => {
    handleHookInput(
      JSON.stringify({
        hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { path: "x" },
        session_id: "metaSess", transcript_path: "/t/metaSess.jsonl", cwd: "/proj",
      }),
      dir,
    );
    const meta = readMeta("metaSess", dir);
    expect(meta?.transcriptPath).toBe("/t/metaSess.jsonl");
    expect(meta?.cwd).toBe("/proj");
  });
});
