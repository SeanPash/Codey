import { describe, it, expect } from "vitest";
import { hangThreshold } from "./hang-config.js";

describe("hangThreshold", () => {
  it("gives subagents the longest leash", () => {
    expect(hangThreshold("Task")).toBe(300_000);
    expect(hangThreshold("Agent")).toBe(300_000);
  });

  it("gives shells room for slow builds and tests", () => {
    expect(hangThreshold("Bash")).toBe(180_000);
    expect(hangThreshold("PowerShell")).toBe(180_000);
  });

  it("keeps fast tools on a short leash so a real stall surfaces quickly", () => {
    expect(hangThreshold("Read")).toBe(45_000);
    expect(hangThreshold("Edit")).toBe(45_000);
  });

  it("falls back to a moderate default for anything else", () => {
    expect(hangThreshold("mcp__unity__do_thing")).toBe(90_000);
  });
});
