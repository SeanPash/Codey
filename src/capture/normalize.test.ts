import { describe, it, expect } from "vitest";
import { normalizeHookEvent } from "./normalize.js";

describe("normalizeHookEvent", () => {
  it("maps a PreToolUse payload", () => {
    const e = normalizeHookEvent({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__unity__execute_menu_item",
      tool_input: { menu: "GameObject/Light" },
      session_id: "s1",
    });
    expect(e.phase).toBe("pre");
    expect(e.tool).toBe("mcp__unity__execute_menu_item");
    expect(e.server).toBe("unity");
    expect(e.sessionId).toBe("s1");
    expect(e.inputHash.length).toBeGreaterThan(0);
  });

  it("maps a PostToolUse payload and detects errors", () => {
    const e = normalizeHookEvent({
      hook_event_name: "PostToolUse",
      tool_name: "Read",
      tool_input: { path: "x" },
      tool_response: { error: "ENOENT: no such file" },
      session_id: "s1",
    });
    expect(e.phase).toBe("post");
    expect(e.server).toBeNull();
    expect(e.isError).toBe(true);
    expect(e.errorText).toContain("ENOENT");
  });

  it("treats a non-error post response as success", () => {
    const e = normalizeHookEvent({
      hook_event_name: "PostToolUse",
      tool_name: "Read",
      tool_input: { path: "x" },
      tool_response: { content: "hello" },
      session_id: "s1",
    });
    expect(e.isError).toBe(false);
    expect(e.errorText).toBeNull();
  });
});
