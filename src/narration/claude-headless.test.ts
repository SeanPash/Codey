import { describe, it, expect } from "vitest";
import { buildClaudeArgs, buildSegmenterMeteredArgs } from "./claude-headless.js";
import { trimArgs, SEGMENTER_SYSTEM_PROMPT } from "./headless-flags.js";

describe("buildClaudeArgs", () => {
  it("uses print mode and the haiku model", () => {
    const args = buildClaudeArgs("hello");
    expect(args).toContain("-p");
    expect(args).toContain("hello");
    const mi = args.indexOf("--model");
    expect(mi).toBeGreaterThan(-1);
    expect(args[mi + 1]).toBe("haiku");
  });

  it("applies the segmenter context trim so timeline narration is cheap too", () => {
    const args = buildClaudeArgs("hello");
    for (const flag of trimArgs(SEGMENTER_SYSTEM_PROMPT)) {
      expect(args).toContain(flag);
    }
    // The segmenter keeps its own system prompt (it must return JSON), not the narrator's.
    expect(args[args.indexOf("--system-prompt") + 1]).toBe(SEGMENTER_SYSTEM_PROMPT);
  });

  it("builds a metered segmenter call that asks for json so usage can be logged", () => {
    const args = buildSegmenterMeteredArgs("hello");
    expect(args.slice(0, 6)).toEqual(["-p", "hello", "--model", "haiku", "--output-format", "json"]);
    for (const flag of trimArgs(SEGMENTER_SYSTEM_PROMPT)) {
      expect(args).toContain(flag);
    }
  });
});
