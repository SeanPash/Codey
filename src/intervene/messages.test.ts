import { describe, it, expect } from "vitest";
import { blockReason } from "./messages.js";

describe("blockReason", () => {
  it("nudge names the repetition count and tells Claude to move on", () => {
    const r = blockReason("nudge", "loop", "Bash", 6);
    expect(r).toContain("6 times");
    expect(r.toLowerCase()).toContain("move on");
  });

  it("different names the repetition count and asks for a new strategy", () => {
    const r = blockReason("different", "repeat_error", "Bash", 4);
    expect(r).toContain("4 times");
    expect(r.toLowerCase()).toContain("different");
  });

  it("phrases a hang as seconds stuck, not a repetition count", () => {
    const r = blockReason("nudge", "hang", "Bash", 90);
    expect(r).toContain("90s");
    expect(r).not.toContain("times");
  });

  it("stop asks Claude to summarize and hand back to the user", () => {
    const r = blockReason("stop", "hang", "Read", 0);
    expect(r.toLowerCase()).toContain("ask the user");
  });

  it("never contains an em dash", () => {
    for (const a of ["nudge", "different", "stop"] as const) {
      expect(blockReason(a, "loop", "Bash", 3)).not.toContain("—");
    }
  });
});
