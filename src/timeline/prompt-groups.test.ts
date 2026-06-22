import { describe, it, expect } from "vitest";
import { groupByPrompt } from "./prompt-groups.js";
import type { TimelineChunk } from "../types.js";
import type { AssistantTurn } from "./transcript.js";
import type { UserPrompt } from "./transcript.js";

function chunk(over: Partial<TimelineChunk>): TimelineChunk {
  return {
    id: "c", name: "Task", narration: "", startTs: 0, endTs: 0,
    tokenTotal: 0, workTotal: 0, contextTotal: 0, warnings: [],
    receipt: { workTotal: 0, workLines: [], contextTotal: 0 }, ...over,
  };
}
function turn(over: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, assistantText: null, ...over };
}

describe("groupByPrompt", () => {
  const prompts: UserPrompt[] = [
    { ts: 1000, text: "hello" },
    { ts: 5000, text: "goodbye" },
  ];
  const chunks = [
    chunk({ id: "c0", startTs: 1100 }),
    chunk({ id: "c1", startTs: 1200 }),
    chunk({ id: "c2", startTs: 5200 }),
  ];
  const turns = [
    turn({ ts: 1100, outputTokens: 100, inputTokens: 50 }),
    turn({ ts: 1200, outputTokens: 200, inputTokens: 50 }),
    turn({ ts: 5200, outputTokens: 300, inputTokens: 50 }),
  ];

  it("splits into one group per prompt with its tasks", () => {
    const g = groupByPrompt(prompts, chunks, turns, 9000, false);
    expect(g).toHaveLength(2);
    expect(g[0].prompt).toBe("hello");
    expect(g[0].chunks.map((c) => c.id)).toEqual(["c0", "c1"]);
    expect(g[1].prompt).toBe("goodbye");
    expect(g[1].chunks.map((c) => c.id)).toEqual(["c2"]);
  });

  it("computes per-group totals and finished durations", () => {
    const g = groupByPrompt(prompts, chunks, turns, 9000, false);
    expect(g[0].workTotal).toBe(300);           // 100 + 200
    expect(g[0].contextTotal).toBe(100);        // 50 + 50
    expect(g[0].tokenTotal).toBe(300);          // work only (not work + context)
    expect(g[0].durationMs).toBe(4000);         // 5000 - 1000
    expect(g[1].workTotal).toBe(300);
    expect(g[1].durationMs).toBe(4000);         // sessionEnd 9000 - prompt start 5000
  });

  it("group token sums reconcile to the session total", () => {
    const g = groupByPrompt(prompts, chunks, turns, 9000, false);
    const sumWork = g.reduce((a, x) => a + x.workTotal, 0);
    const sumCtx = g.reduce((a, x) => a + x.contextTotal, 0);
    expect(sumWork).toBe(600);
    expect(sumCtx).toBe(150);
  });

  it("leaves the live last group's duration null and marks it live", () => {
    const g = groupByPrompt(prompts, chunks, turns, 9000, true);
    expect(g[g.length - 1].live).toBe(true);
    expect(g[g.length - 1].durationMs).toBeNull();
    expect(g[0].live).toBe(false);
  });

  it("makes one 'This session' group when there are no prompts", () => {
    const g = groupByPrompt([], chunks, turns, 9000, false);
    expect(g).toHaveLength(1);
    expect(g[0].prompt).toBe("This session");
    expect(g[0].chunks).toHaveLength(3);
    expect(g[0].workTotal).toBe(600);
  });

  it("puts work before the first prompt into a leading group", () => {
    const early = [chunk({ id: "e0", startTs: 200 }), ...chunks];
    const earlyTurns = [turn({ ts: 200, outputTokens: 10 }), ...turns];
    const g = groupByPrompt(prompts, early, earlyTurns, 9000, false);
    expect(g[0].prompt).toBe("Earlier in this session");
    expect(g[0].chunks.map((c) => c.id)).toEqual(["e0"]);
    expect(g[1].prompt).toBe("hello");
  });

  it("tokenTotal equals work tokens only, not work + context", () => {
    const mixedTurns = [
      turn({ ts: 1100, outputTokens: 100, inputTokens: 500, cacheReadTokens: 2000 }),
      turn({ ts: 1200, outputTokens: 200, inputTokens: 600, cacheReadTokens: 3000 }),
    ];
    const g = groupByPrompt([{ ts: 1000, text: "do it" }], [], mixedTurns, 9000, false);
    // work = 100 + 200 = 300, context = (500+2000) + (600+3000) = 6100; tokenTotal should be just 300
    expect(g[0].workTotal).toBe(300);
    expect(g[0].contextTotal).toBe(6100);
    expect(g[0].tokenTotal).toBe(300);
    expect(g[0].tokenTotal).not.toBe(g[0].workTotal + g[0].contextTotal);
  });
});
