import { describe, it, expect } from "vitest";
import { summarizeCosts, renderCosts } from "./costs.js";
import type { AssistantTurn } from "./transcript.js";

function turn(partial: Partial<AssistantTurn>): AssistantTurn {
  return {
    ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, ...partial,
  };
}

describe("summarizeCosts", () => {
  it("totals output tokens and names the priciest task", () => {
    const turns = [
      turn({ tool: "Read", input: { file_path: "a.ts" }, outputTokens: 30 }),
      turn({ tool: "Write", input: { file_path: "b.ts" }, outputTokens: 120 }),
    ];
    const s = summarizeCosts(turns);
    expect(s.total).toBe(150);
    expect(s.priciest).toBe("Writing b.ts");
    expect(s.lines).toHaveLength(2);
  });

  it("handles an empty transcript", () => {
    const s = summarizeCosts([]);
    expect(s.total).toBe(0);
    expect(s.priciest).toBeNull();
    expect(s.lines).toEqual([]);
  });
});

describe("renderCosts", () => {
  it("says so when there is nothing yet", () => {
    expect(renderCosts(summarizeCosts([]))).toBe("No tasks recorded yet.");
  });

  it("lists tasks with a total", () => {
    const out = renderCosts(summarizeCosts([turn({ tool: "Read", input: { file_path: "a.ts" }, outputTokens: 30 })]));
    expect(out).toContain("Reading a.ts");
    expect(out).toContain("Total");
  });
});
