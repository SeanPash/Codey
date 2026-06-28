import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusLineFor, lineForSession } from "./statusline.js";
import { writeStatus } from "../statusline/state.js";
import { writeSessionMode } from "../statusline/active-mode.js";
import { dirname } from "node:path";
import type { ToolEvent } from "../types.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

function seed(): string {
  const root = mkdtempSync(join(tmpdir(), "codey-sl-"));
  const dir = join(root, "s1");
  mkdirSync(dir, { recursive: true });
  const event: ToolEvent = {
    id: "1", phase: "pre", tool: "Edit", server: null,
    input: { file_path: "auth.ts" }, inputHash: "1", isError: false,
    errorText: null, timestamp: 0, sessionId: "s1",
  };
  writeFileSync(join(dir, "events.jsonl"), JSON.stringify(event) + "\n");
  writeStatus(dir, { mode: "deep", action: null, why: "adding validation", warning: null, updatedAt: 1 });
  return dir;
}

describe("statusLineFor", () => {
  it("renders the live phase and why from events plus the snapshot", () => {
    const out = plain(statusLineFor(seed(), 1000));
    expect(out).toContain("Codey");
    expect(out).toContain("Updating"); // the purpose chip, deep mode
    expect(out).toContain("adding validation"); // the live why is the deep sentence
  });

  it("renders nothing when there is no session dir", () => {
    expect(statusLineFor(join(tmpdir(), "codey-missing-xyz"), 1000)).toBe("");
  });
});

describe("lineForSession", () => {
  it("nudges toward a mode for a session that has not turned Codey on", () => {
    const dir = seed(); // events + snapshot exist, but no mode marker
    const root = dirname(dir);
    const out = plain(lineForSession("s1", root, 1000));
    expect(out).toContain("Codey");
    expect(out).toContain("off");
    // The nudge points at the two ways in: the live timeline and deep narration.
    expect(out).toContain("/codey:timeline");
    expect(out).toContain("/codey:deep");
  });

  it("renders once the session has a mode marker", () => {
    const dir = seed();
    const root = dirname(dir);
    writeSessionMode("simple", dir);
    const out = plain(lineForSession("s1", root, 1000));
    expect(out).toContain("Codey");
    expect(out).toContain("Updating"); // the purpose chip
  });

  it("renders blank when no session is given (no payload session id)", () => {
    expect(lineForSession(null, tmpdir(), 1000)).toBe("");
  });

  it("surfaces a free warning even when Codey is off, with no mode set", () => {
    const root = mkdtempSync(join(tmpdir(), "codey-sl-"));
    const dir = join(root, "s1");
    mkdirSync(dir, { recursive: true });
    // Five identical steps in a row: a loop the free detector catches, no mode on.
    const lines = Array.from({ length: 5 }, (_, i) => JSON.stringify({
      id: String(i), phase: "pre", tool: "Read", server: null,
      input: { file_path: "auth.ts" }, inputHash: "same", isError: false,
      errorText: null, timestamp: i, sessionId: "s1",
    })).join("\n");
    writeFileSync(join(dir, "events.jsonl"), lines + "\n");
    const out = plain(lineForSession("s1", root, 1000));
    expect(out.toLowerCase()).toContain("loop");
    expect(out).toContain("Read");
    expect(out).toContain("/codey:timeline"); // still points at the visual view
    expect(out).not.toContain("/codey:deep"); // the plain nudge is replaced by the warning
  });

  it("falls back to the plain off hint once the warning clears", () => {
    const dir = seed(); // a single edit, no warning, no mode
    const root = dirname(dir);
    const out = plain(lineForSession("s1", root, 1000));
    expect(out).toContain("off");
  });
});
