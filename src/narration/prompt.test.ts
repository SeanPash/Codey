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

  it("deep mode demands a short, mechanism-specific explanation", () => {
    const p = buildNarrationPrompt([ev({})], "deep");
    const low = p.toLowerCase();
    // Hard length cap so the line stays readable and the display never has to drop it.
    expect(low).toContain("two sentences");
    // Tell the narrator to name the actual function/value changed, not just the file.
    expect(low).toContain("function");
  });

  it("feeds the real edit content so the narrator can name the actual change", () => {
    // A long replaced block pushes the meaningful new code well past the first 200 chars, so a
    // blind JSON.stringify(input).slice(0,200) would truncate it away. The summary must surface
    // the new code regardless.
    const padding = "// existing scoring helper used across the match flow ".repeat(6);
    const e = ev({
      tool: "Edit",
      input: {
        file_path: "helper.ts",
        old_string: padding + "function win()",
        new_string: "function loss() { defense -= 1; }",
      },
    });
    const p = buildNarrationPrompt([e], "deep");
    expect(p).toContain("helper.ts");
    // The new code must survive into the prompt, not get truncated away, so the model can
    // describe what the change does.
    expect(p).toContain("loss");
    expect(p).toContain("defense");
  });

  it("surfaces a shell command instead of a raw input blob", () => {
    const e = ev({ tool: "Bash", input: { command: "npm run build" } });
    const p = buildNarrationPrompt([e], "deep");
    expect(p).toContain("npm run build");
  });

  it("bans vague filler in the shared instruction", () => {
    const p = buildNarrationPrompt([ev({})], "deep");
    expect(p.toLowerCase()).toContain("the system");
  });

  it("tells the narrator to avoid em dashes", () => {
    const p = buildNarrationPrompt([ev({})], "simple");
    expect(p).toContain("Never use em dashes");
  });
});

describe("teach prompt", () => {
  it("asks the narrator to explain the underlying concepts", () => {
    const p = buildNarrationPrompt([], "teach");
    expect(p.toLowerCase()).toContain("concept");
  });
});
