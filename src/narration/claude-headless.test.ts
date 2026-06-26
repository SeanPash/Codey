import { describe, it, expect } from "vitest";
import { buildClaudeArgs } from "./claude-headless.js";
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
});
