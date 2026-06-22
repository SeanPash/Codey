import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestSessionId, listSessions, dayBucket } from "./sessions.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Set both atime and mtime of a path to a given epoch-seconds value.
function setMtime(p: string, epochSec: number): void {
  utimesSync(p, epochSec, epochSec);
}

describe("dayBucket", () => {
  it("returns 'Today' when mtime is on the same calendar day as now", () => {
    const now = new Date("2025-06-15T14:00:00").getTime();
    expect(dayBucket(now, now)).toBe("Today");
    // earlier the same day is still Today
    const morningTs = new Date("2025-06-15T08:00:00").getTime();
    expect(dayBucket(morningTs, now)).toBe("Today");
  });

  it("returns 'Yesterday' when mtime is on the previous calendar day", () => {
    const now = new Date("2025-06-15T14:00:00").getTime();
    const yesterdayNoon = new Date("2025-06-14T12:00:00").getTime();
    expect(dayBucket(yesterdayNoon, now)).toBe("Yesterday");
  });

  it("returns a locale date string for older sessions", () => {
    const now = new Date("2025-06-15T14:00:00").getTime();
    const weekAgo = new Date("2025-06-08T10:00:00").getTime();
    const result = dayBucket(weekAgo, now);
    expect(result).not.toBe("Today");
    expect(result).not.toBe("Yesterday");
    // The string must be non-empty
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("latestSessionId", () => {
  it("returns null when there are no sessions", () => {
    expect(latestSessionId(dir)).toBeNull();
  });

  it("falls back to the newest directory when no session has captured events", () => {
    mkdirSync(join(dir, "old"));
    mkdirSync(join(dir, "new"));
    expect(["old", "new"]).toContain(latestSessionId(dir));
    expect(latestSessionId(dir)).toBe("new");
  });

  // The real bug: on Windows, appending to events.jsonl does not bump the parent
  // directory mtime, and the global prompt hook creates an empty folder for every
  // Claude Code session. So the active session has an old directory mtime but the
  // freshest events file, while a just-created empty folder has the newest dir mtime.
  // Ranking by directory mtime picked the wrong (empty) session.
  it("prefers the session with the freshest captured events over a newer empty dir", () => {
    const base = Math.floor(Date.now() / 1000);
    const active = join(dir, "active");
    mkdirSync(active);
    writeFileSync(join(active, "events.jsonl"), '{"phase":"pre"}\n');
    const empty = join(dir, "empty");
    mkdirSync(empty);

    setMtime(active, base - 100);                 // old directory mtime
    setMtime(join(active, "events.jsonl"), base); // but the freshest activity
    setMtime(empty, base - 10);                   // newer dir than active, yet no events

    expect(latestSessionId(dir)).toBe("active");
  });
});

describe("listSessions", () => {
  it("returns an empty array when there are no sessions", () => {
    expect(listSessions(dir)).toEqual([]);
  });

  it("lists real (event-bearing) sessions newest first", () => {
    const base = Math.floor(Date.now() / 1000);
    for (const [name, t] of [["old", base - 100], ["new", base - 1]] as const) {
      const p = join(dir, name);
      mkdirSync(p);
      writeFileSync(join(p, "events.jsonl"), '{"phase":"pre"}\n');
      setMtime(join(p, "events.jsonl"), t);
    }
    const ids = listSessions(dir).map((s) => s.id);
    expect(ids).toContain("old");
    expect(ids[0]).toBe("new");
  });

  it("hides phantom folders that never captured events and have no recent prompt", () => {
    const phantom = join(dir, "phantom");
    mkdirSync(phantom);
    // an old prompt marker but no events, like a headless narration leftover
    writeFileSync(join(phantom, "prompts.jsonl"), JSON.stringify({ ts: 1000 }) + "\n");
    expect(listSessions(dir).map((s) => s.id)).not.toContain("phantom");
  });

  it("only lists sessions that have captured at least one tool event (real terminals)", () => {
    const now = Date.now();
    // real: has events.jsonl
    const real = join(dir, "real");
    mkdirSync(real);
    writeFileSync(join(real, "events.jsonl"), '{"phase":"pre"}\n');
    // phantom: has a prompt but no events.jsonl
    const phantom = join(dir, "phantom");
    mkdirSync(phantom);
    writeFileSync(join(phantom, "prompts.jsonl"), JSON.stringify({ ts: now - 2000 }) + "\n");
    const ids = listSessions(dir, now).map((s) => s.id);
    expect(ids).toContain("real");
    expect(ids).not.toContain("phantom");
  });

  // This test previously relied on a phantom (no events) being kept when recently prompted.
  // Task 1.2 removes that allowance. The "fresh" scenario now only applies to real terminals
  // (those with events.jsonl). The "thinking" state is covered by Task 2.1.
  it("hides a freshly prompted session that has no events (phantom)", () => {
    const now = Date.now();
    const fresh = join(dir, "fresh");
    mkdirSync(fresh);
    writeFileSync(join(fresh, "prompts.jsonl"), JSON.stringify({ ts: now - 2000 }) + "\n");
    const item = listSessions(dir, now).find((x) => x.id === "fresh");
    expect(item).toBeUndefined();
  });

  it("marks a recent-but-idle session open but not running", () => {
    const base = Math.floor(Date.now() / 1000);
    const now = base * 1000;
    const idle = join(dir, "idle");
    mkdirSync(idle);
    writeFileSync(join(idle, "events.jsonl"), '{"phase":"pre"}\n');
    setMtime(join(idle, "events.jsonl"), base - 60); // 60s ago: past running, within open
    const item = listSessions(dir, now).find((x) => x.id === "idle")!;
    expect(item.running).toBe(false);
    expect(item.open).toBe(true);
  });

  it("counts as running when prompted but not yet stopped, even outside the activity window", () => {
    const base = Math.floor(Date.now() / 1000);
    const now = base * 1000;
    const thinking = join(dir, "thinking");
    mkdirSync(thinking);
    writeFileSync(join(thinking, "events.jsonl"), '{"phase":"pre"}\n');
    setMtime(join(thinking, "events.jsonl"), base - 60); // last event 60s ago, outside 15s window
    // Status: prompt at 30s ago, no doneAt -- Claude is still thinking
    writeFileSync(join(thinking, "statusline.json"), JSON.stringify({
      mode: "simple", action: null, why: null, warning: null,
      promptAt: now - 30_000,
      doneAt: null,
      updatedAt: now - 30_000,
    }));
    const itemThinking = listSessions(dir, now).find((x) => x.id === "thinking")!;
    expect(itemThinking.running).toBe(true);

    // Now mark it done: doneAt newer than promptAt
    writeFileSync(join(thinking, "statusline.json"), JSON.stringify({
      mode: "simple", action: null, why: null, warning: null,
      promptAt: now - 30_000,
      doneAt: now - 5_000,
      updatedAt: now - 5_000,
    }));
    const itemDone = listSessions(dir, now).find((x) => x.id === "thinking")!;
    expect(itemDone.running).toBe(false);
  });

  it("does not count a terminal closed mid-turn (stale prompt, no stop) as running", () => {
    const base = Math.floor(Date.now() / 1000);
    const now = base * 1000;
    const stale = join(dir, "stale");
    mkdirSync(stale);
    writeFileSync(join(stale, "events.jsonl"), '{"phase":"pre"}\n');
    setMtime(join(stale, "events.jsonl"), base - 3600); // last event an hour ago
    // Prompt far in the past, Stop never fired: the terminal was closed mid-turn.
    writeFileSync(join(stale, "statusline.json"), JSON.stringify({
      mode: "simple", action: null, why: null, warning: null,
      promptAt: now - 3600_000,
      doneAt: null,
      updatedAt: now - 3600_000,
    }));
    const item = listSessions(dir, now).find((x) => x.id === "stale")!;
    expect(item.running).toBe(false);
  });

  it("enriches each session with name, taskCount, lastPromptTs and live flag", () => {
    const base = Math.floor(Date.now() / 1000);
    const s = join(dir, "sess1");
    mkdirSync(s);
    writeFileSync(join(s, "events.jsonl"), '{"phase":"pre"}\n');           // fresh -> live
    writeFileSync(join(s, "timeline.json"), JSON.stringify({ eventCount: 1, chunks: [{ startIndex: 0, name: "Fix the timeline", narration: "" }] }));
    writeFileSync(join(s, "prompts.jsonl"), JSON.stringify({ ts: 1782070000000 }) + "\n");
    setMtime(join(s, "events.jsonl"), base);

    const item = listSessions(dir).find((x) => x.id === "sess1")!;
    expect(item.name).toBe("Fix the timeline");
    expect(item.taskCount).toBe(1);
    expect(item.lastPromptTs).toBe(1782070000000);
    expect(item.live).toBe(true);
  });

  it("sets a day field on each returned session item", () => {
    const base = Math.floor(Date.now() / 1000);
    const now = base * 1000;
    const s = join(dir, "daySess");
    mkdirSync(s);
    writeFileSync(join(s, "events.jsonl"), '{"phase":"pre"}\n');
    setMtime(join(s, "events.jsonl"), base);
    const item = listSessions(dir, now).find((x) => x.id === "daySess")!;
    expect(typeof item.day).toBe("string");
    expect(item.day.length).toBeGreaterThan(0);
  });
});
