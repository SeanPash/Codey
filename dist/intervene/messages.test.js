import { describe, it, expect } from "vitest";
import { blockReason } from "./messages.js";
describe("blockReason", () => {
    it("nudge leads with the count and tells Claude to move on", () => {
        const r = blockReason("nudge", "Bash", 6);
        expect(r).toContain("6 times");
        expect(r.toLowerCase()).toContain("move on");
    });
    it("different leads with the failure count and asks for a new strategy", () => {
        const r = blockReason("different", "Bash", 4);
        expect(r).toContain("4 times");
        expect(r.toLowerCase()).toContain("different");
    });
    it("stop asks Claude to summarize and hand back to the user", () => {
        const r = blockReason("stop", "Read", 0);
        expect(r.toLowerCase()).toContain("ask the user");
    });
    it("never contains an em dash", () => {
        for (const a of ["nudge", "different", "stop"]) {
            expect(blockReason(a, "Bash", 3)).not.toContain("—");
        }
    });
});
