import { describe, it, expect } from "vitest";
import { formatWarning } from "./format.js";
describe("formatWarning", () => {
    it("prefixes a warning glyph and uses the message", () => {
        const w = { kind: "loop", tool: "T", count: 6, message: "stuck!", timestamp: 0 };
        expect(formatWarning(w)).toBe("⚠️  stuck!");
    });
});
