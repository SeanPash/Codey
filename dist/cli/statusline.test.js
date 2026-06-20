import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusLineFor } from "./statusline.js";
import { writeStatus } from "../statusline/state.js";
describe("statusLineFor", () => {
    it("renders the snapshot in a session dir", () => {
        const dir = mkdtempSync(join(tmpdir(), "codey-"));
        writeStatus(dir, { mode: "deep", action: { tag: "editing", target: "auth.ts" }, why: "adding validation", warning: null, updatedAt: 1 });
        expect(statusLineFor(dir)).toContain("[editing]");
        rmSync(dir, { recursive: true, force: true });
    });
    it("returns empty string when there is no snapshot", () => {
        const dir = mkdtempSync(join(tmpdir(), "codey-"));
        expect(statusLineFor(dir)).toBe("");
        rmSync(dir, { recursive: true, force: true });
    });
});
