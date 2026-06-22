import { describe, it, expect } from "vitest";
import { sessionTotals } from "./totals.js";
import type { AssistantTurn } from "./transcript.js";

function turn(p: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, assistantText: null, ...p };
}

describe("sessionTotals", () => {
  it("sums work (output) and context (input+cache) once across all turns", () => {
    const turns = [
      turn({ outputTokens: 100, inputTokens: 10, cacheReadTokens: 1000, cacheCreationTokens: 5 }),
      turn({ outputTokens: 50, inputTokens: 20, cacheReadTokens: 2000, cacheCreationTokens: 0 }),
    ];
    expect(sessionTotals(turns)).toEqual({ work: 150, context: 3035, total: 3185 });
  });

  it("is zero for no turns", () => {
    expect(sessionTotals([])).toEqual({ work: 0, context: 0, total: 0 });
  });
});
