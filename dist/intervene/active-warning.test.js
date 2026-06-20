import { describe, it, expect } from "vitest";
import { resolveActiveWarning } from "./active-warning.js";
function ev(over) {
    return { id: "x", phase: "pre", tool: "Bash", server: null, input: null,
        inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}
describe("resolveActiveWarning", () => {
    it("returns null for no events", () => {
        expect(resolveActiveWarning([], 1000)).toBeNull();
    });
    it("detects a loop of identical pre calls", () => {
        const events = Array.from({ length: 5 }, (_, i) => ev({ id: String(i), inputHash: "same", timestamp: i }));
        const w = resolveActiveWarning(events, 1000);
        expect(w?.kind).toBe("loop");
        expect(w?.tool).toBe("Bash");
        expect(w?.count).toBe(5);
    });
    it("detects a repeated error", () => {
        const events = Array.from({ length: 3 }, (_, i) => ev({ id: String(i), phase: "post", isError: true, errorText: "boom", timestamp: i }));
        expect(resolveActiveWarning(events, 1000)?.kind).toBe("repeat_error");
    });
    it("detects a hang from a stale open call", () => {
        const w = resolveActiveWarning([ev({ phase: "pre", tool: "Bash", timestamp: 0 })], 60_000);
        expect(w?.kind).toBe("hang");
        expect(w?.tool).toBe("Bash");
    });
});
