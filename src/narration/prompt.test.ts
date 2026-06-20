import { describe, it, expect } from "vitest";
import { buildNarrationPrompt } from "./prompt.js";
import type { ToolEvent } from "../types.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: { path: "a" },
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}

describe("buildNarrationPrompt", () => {
  it("lists the recent tool calls and asks for one sentence in simple mode", () => {
    const p = buildNarrationPrompt([ev({ tool: "mcp__unity__execute_menu_item" })], "simple");
    expect(p).toContain("mcp__unity__execute_menu_item");
    expect(p.toLowerCase()).toContain("one sentence");
  });

  it("asks for more explanation in deep mode", () => {
    const p = buildNarrationPrompt([ev({})], "deep");
    expect(p.toLowerCase()).toContain("why");
  });

  it("tells the narrator to avoid em dashes", () => {
    const p = buildNarrationPrompt([ev({})], "simple");
    expect(p.toLowerCase()).toContain("em dash");
  });
});

describe("teach prompt", () => {
  it("asks the narrator to explain the underlying concepts", () => {
    const p = buildNarrationPrompt([], "teach");
    expect(p.toLowerCase()).toContain("concept");
  });
});
