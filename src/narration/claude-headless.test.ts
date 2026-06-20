import { describe, it, expect } from "vitest";
import { buildClaudeArgs } from "./claude-headless.js";

describe("buildClaudeArgs", () => {
  it("uses print mode and the haiku model", () => {
    const args = buildClaudeArgs("hello");
    expect(args).toContain("-p");
    expect(args).toContain("hello");
    const mi = args.indexOf("--model");
    expect(mi).toBeGreaterThan(-1);
    expect(args[mi + 1]).toBe("haiku");
  });
});
