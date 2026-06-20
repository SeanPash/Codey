import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestSessionId, listSessions } from "./sessions.js";
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
describe("latestSessionId", () => {
    it("returns null when there are no sessions", () => {
        expect(latestSessionId(dir)).toBeNull();
    });
    it("returns the most recently created session directory", () => {
        mkdirSync(join(dir, "old"));
        mkdirSync(join(dir, "new"));
        expect(["old", "new"]).toContain(latestSessionId(dir));
        expect(latestSessionId(dir)).toBe("new");
    });
});
describe("listSessions", () => {
    it("returns an empty array when there are no sessions", () => {
        expect(listSessions(dir)).toEqual([]);
    });
    it("lists session ids newest first", () => {
        mkdirSync(join(dir, "old"));
        mkdirSync(join(dir, "new"));
        const ids = listSessions(dir).map((s) => s.id);
        expect(ids).toContain("old");
        expect(ids[0]).toBe("new");
    });
});
