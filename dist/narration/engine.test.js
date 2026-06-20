import { describe, it, expect } from "vitest";
import { NarrationEngine } from "./engine.js";
function ev(i) {
    return { id: String(i), phase: "pre", tool: "T", server: null, input: { i },
        inputHash: "h" + i, isError: false, errorText: null, timestamp: i * 1000, sessionId: "s" };
}
describe("NarrationEngine", () => {
    it("narrates once the simple-mode threshold of new events is reached", async () => {
        const calls = [];
        const engine = new NarrationEngine("simple", async (prompt) => { calls.push(prompt); return "Claude is reading files."; });
        let out = await engine.onEvents([ev(0), ev(1), ev(2), ev(3)], 100000); // 4 events < 5
        expect(out).toBeNull();
        expect(calls).toHaveLength(0);
        out = await engine.onEvents([ev(0), ev(1), ev(2), ev(3), ev(4)], 100000); // now 5
        expect(out).toBe("Claude is reading files.");
        expect(calls).toHaveLength(1);
    });
    it("does not re-narrate until enough NEW events arrive again", async () => {
        const engine = new NarrationEngine("deep", async () => "narr");
        await engine.onEvents([ev(0), ev(1)], 100000); // deep needs 2 -> narrates
        const second = await engine.onEvents([ev(0), ev(1), ev(2)], 100000); // only 1 new -> no
        expect(second).toBeNull();
    });
});
