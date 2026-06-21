import { describe, it, expect } from "vitest";
import { actionFromEvent } from "./from-event.js";
import type { ToolEvent } from "../types.js";

const base: ToolEvent = { id: "1", phase: "pre", tool: "Edit", server: null, input: { file_path: "/x/auth.ts" }, inputHash: "h", isError: false, errorText: null, timestamp: 1, sessionId: "s" };

describe("actionFromEvent", () => {
  it("derives a label from a pre event", () => {
    expect(actionFromEvent(base)).toEqual({ tag: "editing", target: "the file auth.ts" });
  });
  it("ignores post events (keeps the last pre action)", () => {
    expect(actionFromEvent({ ...base, phase: "post" })).toBeNull();
  });
});
