import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestSessionId, listSessions } from "./sessions.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Set both atime and mtime of a path to a given epoch-seconds value.
function setMtime(p: string, epochSec: number): void {
  utimesSync(p, epochSec, epochSec);
}

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

  it("keeps a freshly prompted session even before its first tool call, marked running", () => {
    const now = Date.now();
    const fresh = join(dir, "fresh");
    mkdirSync(fresh);
    writeFileSync(join(fresh, "prompts.jsonl"), JSON.stringify({ ts: now - 2000 }) + "\n");
    const item = listSessions(dir, now).find((x) => x.id === "fresh");
    expect(item).toBeDefined();
    expect(item!.running).toBe(true);
    expect(item!.open).toBe(true);
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
});
