import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLive } from "./load-snapshot.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "codey-liveprompt-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

// Build a session with a real prompt in its transcript, a captured tool call, and an optional
// user-interrupt marker so the pane has both a prompt heading and a cancelled state to surface.
function session(id: string, promptText: string, opts: { interrupted?: boolean } = {}): void {
  const dir = join(root, id);
  mkdirSync(dir);
  const promptTs = NOW - 5000;
  const eventTs = NOW - 4000;
  const transcript = join(dir, "transcript.jsonl");

  writeFileSync(join(dir, "events.jsonl"),
    JSON.stringify({ phase: "pre", tool: "Read", input: { file_path: "a.ts" }, timestamp: eventTs }) + "\n");
  writeFileSync(join(dir, "prompts.jsonl"), JSON.stringify({ ts: promptTs }) + "\n");
  writeFileSync(join(dir, "meta.json"),
    JSON.stringify({ sessionId: id, cwd: dir, transcriptPath: transcript }));

  let lines = JSON.stringify({ type: "user", timestamp: iso(promptTs), message: { content: promptText } }) + "\n";
  if (opts.interrupted) {
    lines += JSON.stringify({
      type: "user", timestamp: iso(NOW - 3000),
      message: { content: "[Request interrupted by user]" },
    }) + "\n";
  }
  writeFileSync(transcript, lines);
}

describe("loadLive prompt and cancelled", () => {
  it("surfaces the latest prompt text on each pane", () => {
    session("a", "fix the timeline bug");
    const s = loadLive(root).sessions.find((x) => x.sessionId === "a");
    expect(s?.prompt).toBe("fix the timeline bug");
    expect(s?.cancelled).toBe(false);
  });

  it("flags a pane whose turn the user interrupted", () => {
    session("c", "refactor the parser", { interrupted: true });
    const s = loadLive(root).sessions.find((x) => x.sessionId === "c");
    expect(s?.cancelled).toBe(true);
    expect(s?.prompt).toBe("refactor the parser");
  });
});
