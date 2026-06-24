import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { explain, fillCachedExplanations, timelineDefaults, type ExplainDeps } from "./explain-service.js";
import { armBudget, addSpend } from "../budget/budget.js";
import type { SessionSnapshot, ReceiptLine, TimelineChunk, PromptGroup } from "../types.js";

function rl(over: Partial<ReceiptLine> = {}): ReceiptLine {
  return { label: "Reading a.ts", title: "Checking a.ts", subtitle: "Reading a.ts to follow how it works.",
    tool: "Read", tokens: 10, status: "ok", errorText: null,
    resolved: false, raw: "a.ts", why: "checking the shape", failSummary: null, ts: 1, thoughtFirst: false, ...over };
}
function chunk(id: string, lines: ReceiptLine[]): TimelineChunk {
  return { id, name: `Task ${id}`, narration: "did stuff", startTs: 0, endTs: 1, tokenTotal: 0,
    workTotal: 0, contextTotal: 0, warnings: [], receipt: { workTotal: 0, workLines: lines, contextTotal: 0 }, explanation: null };
}
function group(id: string, chunks: TimelineChunk[]): PromptGroup {
  return { id, prompt: "do the thing", startTs: 0, endTs: 1, durationMs: 1, workTotal: 0,
    contextTotal: 0, tokenTotal: 0, taskCount: chunks.length, chunks, live: false, cancelled: false, summary: null };
}
function snapshot(): SessionSnapshot {
  const c0 = chunk("c0", [rl(), rl({ label: "Editing a.ts", tool: "Edit" })]);
  return {
    sessionId: "s1", sessionName: "S", project: null, color: "c", live: false, startedAt: 0,
    lastActivityAt: 0, totalTokens: 0, workTotal: 0, contextTotal: 0, taskCount: 1,
    priciestTaskName: null, priciestTaskWork: 0, groups: [group("p0", [c0])], chunks: [c0], activeWarning: null,
    seedDepth: "deep", genAuto: true, budgetLeft: null,
  };
}

let root: string;
let deps: ExplainDeps;
let narrate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "codey-svc-"));
  narrate = vi.fn(async (_p: string) => ({ text: "Because it needed doing.", tokens: 42 }));
  deps = { narrate, root, sessionDir: join(root, "s1") };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("explain", () => {
  it("generates a task explanation on a miss, then serves it from cache", async () => {
    const snap = snapshot();
    const first = await explain(snap, { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    expect(first.text).toBe("Because it needed doing.");
    expect(first.cached).toBe(false);
    expect(narrate).toHaveBeenCalledOnce();

    const second = await explain(snap, { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    expect(second.text).toBe("Because it needed doing.");
    expect(second.cached).toBe(true);
    expect(narrate).toHaveBeenCalledOnce(); // no second generation
  });

  it("explains a single action by its id", async () => {
    const snap = snapshot();
    const r = await explain(snap, { sessionId: "s1", scope: "action", id: "c0#1", depth: "simple" }, deps);
    expect(r.text).toBe("Because it needed doing.");
    expect(narrate.mock.calls[0][0]).toContain("Editing a.ts");
  });

  it("summarizes a prompt group", async () => {
    const snap = snapshot();
    const r = await explain(snap, { sessionId: "s1", scope: "summary", id: "p0", depth: "deep" }, deps);
    expect(r.text).toBe("Because it needed doing.");
    expect(narrate.mock.calls[0][0]).toContain("do the thing");
  });

  it("pauses without generating when the budget is spent", async () => {
    armBudget(deps.sessionDir, 5);
    addSpend(deps.sessionDir, 10);
    const r = await explain(snapshot(), { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    expect(r.paused).toBe(true);
    expect(r.text).toBeNull();
    expect(narrate).not.toHaveBeenCalled();
  });

  it("returns null text for an unknown id", async () => {
    const r = await explain(snapshot(), { sessionId: "s1", scope: "task", id: "nope", depth: "deep" }, deps);
    expect(r.text).toBeNull();
    expect(narrate).not.toHaveBeenCalled();
  });

  it("counts the spend against the budget", async () => {
    armBudget(deps.sessionDir, 1000);
    await explain(snapshot(), { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    const second = await explain(snapshot(), { sessionId: "s1", scope: "summary", id: "p0", depth: "deep" }, deps);
    expect(second.text).toBeTruthy();
  });
});

describe("timelineDefaults", () => {
  it("opens deep/teach sessions in auto at their depth", () => {
    expect(timelineDefaults("deep")).toEqual({ seedDepth: "deep", genAuto: true });
    expect(timelineDefaults("teach")).toEqual({ seedDepth: "teach", genAuto: true });
  });
  it("keeps simple, ask, and off sessions frugal", () => {
    expect(timelineDefaults("simple")).toEqual({ seedDepth: "simple", genAuto: false });
    expect(timelineDefaults("ask")).toEqual({ seedDepth: "deep", genAuto: false });
    expect(timelineDefaults(null)).toEqual({ seedDepth: "deep", genAuto: false });
  });
});

describe("fillCachedExplanations", () => {
  it("fills task explanations and group summaries from cache at the given depth", async () => {
    const snap = snapshot();
    await explain(snap, { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    await explain(snap, { sessionId: "s1", scope: "summary", id: "p0", depth: "deep" }, deps);

    const filled = fillCachedExplanations(snapshot(), "deep", root);
    expect(filled.chunks[0].explanation).toBe("Because it needed doing.");
    expect(filled.groups[0].summary).toBe("Because it needed doing.");
    expect(filled.groups[0].chunks[0].explanation).toBe("Because it needed doing.");
  });

  it("leaves fields null when nothing is cached at that depth", () => {
    const filled = fillCachedExplanations(snapshot(), "teach", root);
    expect(filled.chunks[0].explanation).toBeNull();
    expect(filled.groups[0].summary).toBeNull();
  });
});
