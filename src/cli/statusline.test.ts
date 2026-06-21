import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusLineFor } from "./statusline.js";
import { writeStatus } from "../statusline/state.js";
import type { ToolEvent } from "../types.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

function seed(): string {
  const dir = mkdtempSync(join(tmpdir(), "codey-sl-"));
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
  it("renders the current task and why from events plus the snapshot", () => {
    const out = plain(statusLineFor(seed(), 1000));
    expect(out).toContain("CODEY");
    expect(out).toContain("#1 Claude is editing the file auth.ts");
    expect(out).toContain("adding validation");
  });

  it("renders nothing when there is no session dir", () => {
    expect(statusLineFor(join(tmpdir(), "codey-missing-xyz"), 1000)).toBe("");
  });
});
