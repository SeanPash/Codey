import { describe, it, expect } from "vitest";
import { buildSnapshot } from "./snapshot.js";
import type { ToolEvent } from "../types.js";
import type { AssistantTurn } from "../timeline/transcript.js";
import type { RawChunk } from "../timeline/segment.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}
function turn(over: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, ...over };
}

describe("buildSnapshot", () => {
  const events: ToolEvent[] = [
    ev({ id: "0", timestamp: 100, tool: "Write", inputHash: "w" }),
    ev({ id: "1", timestamp: 200, tool: "Bash", inputHash: "b" }),
    ev({ id: "2", timestamp: 5000, tool: "Read", inputHash: "r" }),
  ];
  const rawChunks: RawChunk[] = [
    { startIndex: 0, name: "Build it", narration: "Wrote and ran code." },
    { startIndex: 2, name: "Read up", narration: "Read a file." },
  ];
  const turns: AssistantTurn[] = [
    turn({ ts: 120, outputTokens: 300, inputTokens: 1000, tool: "Write", input: { file_path: "/a.cs" } }),
    turn({ ts: 220, outputTokens: 100, inputTokens: 1200, tool: "Bash", input: { command: "build" } }),
    turn({ ts: 5100, outputTokens: 50, inputTokens: 800, tool: "Read", input: { file_path: "/b.cs" } }),
  ];

  it("builds one chunk per raw chunk with windowed receipts and totals", () => {
    const snap = buildSnapshot({ sessionId: "s", sessionName: "Proj", project: null, color: "c", live: true, events, rawChunks, turns, prompts: [], now: 10000 });
    expect(snap.chunks).toHaveLength(2);
    expect(snap.chunks[0].receipt.workTotal).toBe(400);    // 300 + 100 in [100,5000)
    expect(snap.chunks[1].receipt.workTotal).toBe(50);     // 50 in [5000, inf)
    expect(snap.taskCount).toBe(2);
    expect(snap.totalTokens).toBe(snap.chunks[0].tokenTotal + snap.chunks[1].tokenTotal);
    expect(snap.priciestTaskName).toBe("Build it");
    expect(snap.live).toBe(true);
  });

  it("headlines work, ranks priciest by work, and exposes per-chunk work/context", () => {
    const e2: ToolEvent[] = [
      ev({ id: "0", timestamp: 1000, tool: "Read", inputHash: "r" }),
      ev({ id: "1", timestamp: 2000, tool: "Write", inputHash: "w" }),
    ];
    const t2: AssistantTurn[] = [
      turn({ ts: 1000, outputTokens: 50, cacheReadTokens: 5000, tool: "Read", input: { file_path: "a.ts" } }),
      turn({ ts: 2000, outputTokens: 400, cacheReadTokens: 5000, tool: "Write", input: { file_path: "b.ts" } }),
    ];
    const rc2: RawChunk[] = [
      { startIndex: 0, name: "Look around", narration: "" },
      { startIndex: 1, name: "Write the file", narration: "" },
    ];
    const snap = buildSnapshot({ sessionId: "s", sessionName: "s", project: null, color: "c", live: false, events: e2, rawChunks: rc2, turns: t2, prompts: [], now: 10000 });
    expect(snap.workTotal).toBe(450);
    expect(snap.totalTokens).toBe(10450);          // work 450 + context 10000, counted once
    expect(snap.priciestTaskName).toBe("Write the file"); // by work, not context
    expect(snap.chunks[0].workTotal).toBe(50);
    expect(snap.chunks[1].workTotal).toBe(400);
    expect(snap.chunks[0].contextTotal).toBe(5000);
  });

  it("splits one segmentation task across prompt boundaries so each group owns its tasks", () => {
    const e3: ToolEvent[] = [
      ev({ id: "0", timestamp: 1100, tool: "Read", inputHash: "r" }),
      ev({ id: "1", timestamp: 5200, tool: "Write", inputHash: "w" }),
    ];
    const t3: AssistantTurn[] = [
      turn({ ts: 1100, outputTokens: 100, tool: "Read", input: { file_path: "a.ts" } }),
      turn({ ts: 5200, outputTokens: 200, tool: "Write", input: { file_path: "b.ts" } }),
    ];
    // One AI chunk covers the whole session, but two prompts span it.
    const rc3: RawChunk[] = [{ startIndex: 0, name: "Do stuff", narration: "n" }];
    const prompts = [{ ts: 1000, text: "hello" }, { ts: 5000, text: "goodbye" }];
    const snap = buildSnapshot({ sessionId: "s", sessionName: "s", project: null, color: "c", live: false, events: e3, rawChunks: rc3, turns: t3, prompts, now: 9000 });
    expect(snap.groups).toHaveLength(2);
    expect(snap.groups[0].taskCount).toBe(1);
    expect(snap.groups[1].taskCount).toBe(1);
    expect(snap.groups[0].chunks[0].name).toBe("Do stuff"); // name carries onto both pieces
    expect(snap.chunks).toHaveLength(2);
  });

  it("attaches a repeat-error warning to the chunk where it happened", () => {
    const errEvents = [
      ev({ id: "0", phase: "post", tool: "Bash", isError: true, errorText: "boom", timestamp: 100 }),
      ev({ id: "1", phase: "post", tool: "Bash", isError: true, errorText: "boom", timestamp: 200 }),
      ev({ id: "2", phase: "post", tool: "Bash", isError: true, errorText: "boom", timestamp: 300 }),
    ];
    const snap = buildSnapshot({
      sessionId: "s", sessionName: "P", project: null, color: "c", live: false,
      events: errEvents, rawChunks: [{ startIndex: 0, name: "Fix", narration: "" }], turns: [],
      prompts: [], now: 10000,
    });
    expect(snap.chunks[0].warnings.some((w) => w.kind === "repeat_error")).toBe(true);
  });
});
