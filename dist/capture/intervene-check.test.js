import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleIntervenePayload } from "./intervene-check.js";
import { writeInterventionFile, readInterventionFile } from "../intervene/file-io.js";
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
function payload(over = {}) {
    return JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", session_id: "s1", ...over });
}
describe("handleIntervenePayload", () => {
    it("returns a block output and consumes the file when the tool matches", () => {
        writeInterventionFile("s1", { action: "nudge", tool: "Bash", count: 6, createdAt: 1000 }, dir);
        const out = handleIntervenePayload(payload(), dir, 2000);
        expect(out).toContain("permissionDecision");
        expect(out).toContain("6 times");
        expect(readInterventionFile("s1", dir)).toBeNull(); // one-shot
    });
    it("returns null and leaves the file when a different tool fires", () => {
        writeInterventionFile("s1", { action: "nudge", tool: "Bash", count: 6, createdAt: 1000 }, dir);
        const out = handleIntervenePayload(payload({ tool_name: "Read" }), dir, 2000);
        expect(out).toBeNull();
        expect(readInterventionFile("s1", dir)).not.toBeNull();
    });
    it("returns null and clears an expired file without blocking", () => {
        writeInterventionFile("s1", { action: "nudge", tool: "Bash", count: 6, createdAt: 1000 }, dir);
        const out = handleIntervenePayload(payload(), dir, 1000 + 90_001);
        expect(out).toBeNull();
        expect(readInterventionFile("s1", dir)).toBeNull();
    });
    it("returns null when there is no pending file", () => {
        expect(handleIntervenePayload(payload(), dir, 2000)).toBeNull();
    });
    it("returns null on blank or unparseable input", () => {
        expect(handleIntervenePayload("", dir, 2000)).toBeNull();
        expect(handleIntervenePayload("not json", dir, 2000)).toBeNull();
    });
});
