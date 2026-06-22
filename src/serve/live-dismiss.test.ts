import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLive } from "./load-snapshot.js";
import { dismiss } from "../store/dismissed-store.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "codey-live-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

function session(id: string): void {
  const dir = join(root, id);
  mkdirSync(dir);
  // A minimal but real captured tool call so the session counts as a live terminal.
  writeFileSync(join(dir, "events.jsonl"),
    JSON.stringify({ phase: "pre", tool: "Read", input: { file_path: "a.ts" }, timestamp: Date.now() }) + "\n");
}

describe("loadLive dismiss", () => {
  it("drops a dismissed session from the grid and lists it under hidden", () => {
    session("keep");
    session("hide");
    dismiss(root, "hide");

    const live = loadLive(root);
    const ids = live.sessions.map((s) => s.sessionId);
    expect(ids).toContain("keep");
    expect(ids).not.toContain("hide");
    expect(live.hidden.map((h) => h.sessionId)).toContain("hide");
  });

  it("keeps everything visible when nothing is dismissed", () => {
    session("a");
    session("b");
    const live = loadLive(root);
    expect(live.sessions.map((s) => s.sessionId).sort()).toEqual(["a", "b"]);
    expect(live.hidden).toEqual([]);
  });
});
