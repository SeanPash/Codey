import { describe, it, expect } from "vitest";
import { NarrationEngine } from "./engine.js";
import type { ToolEvent } from "../types.js";

function ev(i: number): ToolEvent {
  return { id: String(i), phase: "pre", tool: "T", server: null, input: { i },
    inputHash: "h" + i, isError: false, errorText: null, timestamp: i * 1000, sessionId: "s" };
}

describe("NarrationEngine", () => {
  it("narrates a why in simple mode, then waits for a new event before narrating again", async () => {
    const calls: string[] = [];
    const engine = new NarrationEngine("simple", async (prompt) => { calls.push(prompt); return "Claude is reading files."; });

    let out = await engine.onEvents([ev(0)], 100000); // first event -> simple narrates a short why
    expect(out).toBe("Claude is reading files.");
    expect(calls).toHaveLength(1);

    out = await engine.onEvents([ev(0)], 200000); // no new events -> nothing to add
    expect(out).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("does not re-narrate until enough NEW events arrive again", async () => {
    const engine = new NarrationEngine("deep", async () => "narr");
    await engine.onEvents([ev(0), ev(1)], 100000); // deep needs 2 -> narrates
    const second = await engine.onEvents([ev(0), ev(1), ev(2)], 100000); // only 1 new -> no
    expect(second).toBeNull();
  });
});
