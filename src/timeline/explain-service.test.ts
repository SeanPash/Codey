import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { explain, fillCachedExplanations, collectCachedExplanations, timelineDefaults, type ExplainDeps } from "./explain-service.js";
import { armBudget, addSpend } from "../budget/budget.js";
import { readSpend } from "../cost/spend-log.js";
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
    codeyOverhead: { total: { calls: 0, tokens: 0, costUsd: 0 }, byKind: { narration: { calls: 0, tokens: 0, costUsd: 0 }, timeline: { calls: 0, tokens: 0, costUsd: 0 }, summary: { calls: 0, tokens: 0, costUsd: 0 } }, byMode: {} },
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

  it("suppresses a vacuous 'paused and reflected' generation instead of showing it", async () => {
    narrate.mockResolvedValueOnce({ text: "The agent paused and reflected before its next action.", tokens: 12 });
    const snap = snapshot();
    const r = await explain(snap, { sessionId: "s1", scope: "action", id: "c0#0", depth: "deep" }, deps);
    expect(r.text).toBeNull();
    expect(r.cached).toBe(false);
    // Nothing usable was produced, so a later retry is free to generate again (not cached).
    narrate.mockResolvedValueOnce({ text: "Reread a.ts to line up the new helper.", tokens: 12 });
    const retry = await explain(snap, { sessionId: "s1", scope: "action", id: "c0#0", depth: "deep" }, deps);
    expect(retry.text).toBe("Reread a.ts to line up the new helper.");
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

  it("logs a generation as summary spend in the overhead log", async () => {
    mkdirSync(deps.sessionDir, { recursive: true });
    await explain(snapshot(), { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    const entries = readSpend(deps.sessionDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("summary");
    // The mock reports only a token count, so usage falls back to that count with no breakdown.
    expect(entries[0].usage.input + entries[0].usage.output
      + entries[0].usage.cacheRead + entries[0].usage.cacheWrite).toBe(42);
  });

  it("carries real usage and cost into the summary spend entry when the narrator reports them", async () => {
    mkdirSync(deps.sessionDir, { recursive: true });
    narrate.mockResolvedValueOnce({
      text: "Reread a.ts to line up the helper.", tokens: 100,
      usage: { input: 10, output: 20, cacheRead: 70, cacheWrite: 0 }, costUsd: 0.012,
    });
    await explain(snapshot(), { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    const entry = readSpend(deps.sessionDir)[0];
    expect(entry.usage).toEqual({ input: 10, output: 20, cacheRead: 70, cacheWrite: 0 });
    expect(entry.costUsd).toBe(0.012);
  });

  it("does not log spend when nothing is generated", async () => {
    mkdirSync(deps.sessionDir, { recursive: true });
    await explain(snapshot(), { sessionId: "s1", scope: "task", id: "nope", depth: "deep" }, deps);
    expect(readSpend(deps.sessionDir)).toHaveLength(0);
  });
});

describe("timelineDefaults", () => {
  it("opens deep/teach sessions in auto at their depth", () => {
    expect(timelineDefaults("deep")).toEqual({ seedDepth: "deep", genAuto: true });
    expect(timelineDefaults("teach")).toEqual({ seedDepth: "teach", genAuto: true });
  });
  it("keeps simple and off sessions frugal", () => {
    expect(timelineDefaults("simple")).toEqual({ seedDepth: "simple", genAuto: false });
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

describe("collectCachedExplanations", () => {
  it("gathers every cached entry across scopes and depths into one keyed map", async () => {
    const snap = snapshot();
    // Generate a mix the user would have clicked: a task at deep, an action at simple, a
    // summary at teach. Each is on disk at its own depth.
    await explain(snap, { sessionId: "s1", scope: "task", id: "c0", depth: "deep" }, deps);
    await explain(snap, { sessionId: "s1", scope: "action", id: "c0#1", depth: "simple" }, deps);
    await explain(snap, { sessionId: "s1", scope: "summary", id: "p0", depth: "teach" }, deps);

    const map = collectCachedExplanations(snapshot(), root);
    expect(map["task|c0|deep"]).toBe("Because it needed doing.");
    expect(map["action|c0#1|simple"]).toBe("Because it needed doing.");
    expect(map["summary|p0|teach"]).toBe("Because it needed doing.");
    // Nothing was generated at these depths, so they are absent (not null).
    expect(map["task|c0|simple"]).toBeUndefined();
    expect(map["summary|p0|deep"]).toBeUndefined();
  });

  it("returns an empty map when nothing has been cached", () => {
    expect(collectCachedExplanations(snapshot(), root)).toEqual({});
  });
});
