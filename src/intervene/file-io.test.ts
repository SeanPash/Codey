import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeInterventionFile, readInterventionFile, deleteInterventionFile } from "./file-io.js";
import type { InterventionFile } from "../types.js";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const f: InterventionFile = { action: "nudge", kind: "loop", tool: "Bash", count: 6, createdAt: 123 };

describe("intervention file io", () => {
  it("writes and reads back the file", () => {
    writeInterventionFile("s1", f, dir);
    expect(readInterventionFile("s1", dir)).toEqual(f);
  });

  it("returns null when no file exists", () => {
    expect(readInterventionFile("missing", dir)).toBeNull();
  });

  it("deletes the file (one-shot) and is safe to delete twice", () => {
    writeInterventionFile("s1", f, dir);
    deleteInterventionFile("s1", dir);
    expect(readInterventionFile("s1", dir)).toBeNull();
    expect(() => deleteInterventionFile("s1", dir)).not.toThrow();
  });
});
