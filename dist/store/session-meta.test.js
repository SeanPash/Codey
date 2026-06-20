import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeMetaIfAbsent, readMeta } from "./session-meta.js";
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
describe("session-meta", () => {
    it("writes meta once and reads it back", () => {
        writeMetaIfAbsent({ sessionId: "s1", transcriptPath: "/t/s1.jsonl", cwd: "/proj" }, dir);
        expect(readMeta("s1", dir)).toEqual({ sessionId: "s1", transcriptPath: "/t/s1.jsonl", cwd: "/proj" });
    });
    it("does not overwrite an existing meta", () => {
        writeMetaIfAbsent({ sessionId: "s1", transcriptPath: "/first.jsonl", cwd: "/a" }, dir);
        writeMetaIfAbsent({ sessionId: "s1", transcriptPath: "/second.jsonl", cwd: "/b" }, dir);
        expect(readMeta("s1", dir)?.transcriptPath).toBe("/first.jsonl");
    });
    it("returns null when no meta exists", () => {
        expect(readMeta("missing", dir)).toBeNull();
    });
});
