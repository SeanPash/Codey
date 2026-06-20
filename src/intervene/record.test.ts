import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionStore } from "../store/session-store.js";
import { recordIntervention } from "./record.js";
import { readInterventionFile } from "./file-io.js";
import type { ToolEvent } from "../types.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Bash", server: null, input: null,
    inputHash: "same", isError: false, errorText: null, timestamp: 0, sessionId: "s1", ...over };
}

function seedLoop(): void {
  const store = new SessionStore("s1", dir);
  for (let i = 0; i < 5; i++) store.append(ev({ id: String(i), timestamp: i }));
}

describe("recordIntervention", () => {
  it("writes the file from the active warning for a valid action", () => {
    seedLoop();
    expect(recordIntervention("s1", "nudge", dir)).toBe(true);
    const f = readInterventionFile("s1", dir);
    expect(f).toMatchObject({ action: "nudge", tool: "Bash", count: 5 });
    expect(typeof f?.createdAt).toBe("number");
  });

  it("rejects an unknown action and writes nothing", () => {
    seedLoop();
    expect(recordIntervention("s1", "explode", dir)).toBe(false);
    expect(readInterventionFile("s1", dir)).toBeNull();
  });

  it("writes nothing when there is no active warning", () => {
    // A single recent call: not a loop, not a repeat error, and not a stale-enough open call to
    // read as a hang. (timestamp 0 would look like a >45s-old hang against the real Date.now().)
    new SessionStore("s1", dir).append(ev({ id: "0", timestamp: Date.now() }));
    expect(recordIntervention("s1", "nudge", dir)).toBe(false);
    expect(readInterventionFile("s1", dir)).toBeNull();
  });
});
