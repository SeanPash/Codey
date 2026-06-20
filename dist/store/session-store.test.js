import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionStore } from "./session-store.js";
function ev(over) {
    return {
        id: "1", phase: "pre", tool: "Read", server: null, input: null,
        inputHash: "h", isError: false, errorText: null, timestamp: 1, sessionId: "s1", ...over,
    };
}
let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "codey-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
describe("SessionStore", () => {
    it("appends events and reads them back in order", () => {
        const store = new SessionStore("s1", dir);
        store.append(ev({ id: "a" }));
        store.append(ev({ id: "b" }));
        const all = store.readAll();
        expect(all.map((e) => e.id)).toEqual(["a", "b"]);
    });
    it("readAll on a fresh session returns an empty array", () => {
        expect(new SessionStore("missing", dir).readAll()).toEqual([]);
    });
});
