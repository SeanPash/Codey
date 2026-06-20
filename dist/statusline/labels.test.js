import { describe, it, expect } from "vitest";
import { actionLabel } from "./labels.js";
describe("actionLabel", () => {
    it("uses a gerund tag and a target", () => {
        expect(actionLabel("Read", { file_path: "/a/config.ts" })).toEqual({ tag: "reading", target: "config.ts" });
        expect(actionLabel("Edit", { file_path: "/a/auth.ts" })).toEqual({ tag: "editing", target: "auth.ts" });
        expect(actionLabel("Bash", { command: "npm test" })).toEqual({ tag: "running", target: "npm test" });
        expect(actionLabel("Grep", { pattern: "validateUser" })).toEqual({ tag: "searching", target: "validateUser" });
    });
    it("falls back to a generic tag for unknown tools", () => {
        expect(actionLabel("Write", {})).toEqual({ tag: "writing", target: "a file" });
    });
});
