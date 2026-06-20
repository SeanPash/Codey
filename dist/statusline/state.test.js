import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeStatus, readStatus } from "./state.js";
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
describe("status snapshot", () => {
    it("round-trips a snapshot", () => {
        const snap = { mode: "deep", action: { tag: "editing", target: "auth.ts" }, why: "adding validation", warning: null, updatedAt: 1 };
        writeStatus(dir, snap);
        expect(readStatus(dir)).toEqual(snap);
        rmSync(dir, { recursive: true, force: true });
    });
    it("returns null when no snapshot exists", () => {
        expect(readStatus(dir)).toBeNull();
        rmSync(dir, { recursive: true, force: true });
    });
});
