import { describe, it, expect } from "vitest";
import { buildNowView } from "./now.js";
import type { ToolEvent } from "../types.js";
import type { StatusSnapshot } from "../statusline/state.js";

function ev(over: Partial<ToolEvent>): ToolEvent {
  return { id: "x", phase: "pre", tool: "Read", server: null, input: null,
    inputHash: "h", isError: false, errorText: null, timestamp: 0, sessionId: "s", ...over };
}
function status(over: Partial<StatusSnapshot>): StatusSnapshot {
  return { mode: "simple", action: null, why: null, warning: null, updatedAt: 0, ...over };
}

describe("buildNowView", () => {
  it("reports the current step from the newest open call", () => {
    const now = 10_000;
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "a.ts" }, timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 9000 }),
    ];
    const v = buildNowView(events, null, now);
    expect(v.live).toBe(true);
    expect(v.action?.tool).toBe("Bash");
    expect(v.action?.label).toBe("Running the tests");
    expect(v.since).toBe(9000);
  });

  it("lists the last completed steps newest first, with status", () => {
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "a.ts" }, timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1100 }),
      ev({ phase: "pre", tool: "Edit", input: { file_path: "b.ts" }, timestamp: 1200 }),
      ev({ phase: "post", tool: "Edit", isError: true, timestamp: 1300 }),
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 1400 }),
    ];
    const v = buildNowView(events, null, 2000);
    expect(v.steps.map((s) => s.label)).toEqual(["Edited b.ts", "Read a.ts"]);
    expect(v.steps[0].status).toBe("fail");
    expect(v.steps[1].status).toBe("ok");
  });

  it("is thinking when a prompt arrived after the last activity and nothing is open", () => {
    const now = 30_000;
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
    ];
    const v = buildNowView(events, status({ promptAt: 29_000, doneAt: 2000 }), now);
    expect(v.thinking).toBe(true);
    expect(v.action).toBeNull();
    expect(v.live).toBe(true);
    expect(v.since).toBe(29_000);
  });

  it("is not live when the session is idle (no open call, no recent prompt)", () => {
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
    ];
    const v = buildNowView(events, status({ doneAt: 1600 }), 10_000_000);
    expect(v.live).toBe(false);
    expect(v.action).toBeNull();
  });

  it("goes quiet a short time after the last activity, not 30 minutes later", () => {
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
    ];
    // 60s after the last activity, with no open call and no fresh prompt: the strip is done.
    const v = buildNowView(events, status({ doneAt: 1600 }), 61_500);
    expect(v.live).toBe(false);
    // But it still bridges the brief gap between two back-to-back tools.
    const bridge = buildNowView(events, status({ doneAt: 1600 }), 6500);
    expect(bridge.live).toBe(true);
  });

  it("is not live when the terminal was closed, even mid-tool", () => {
    const now = 5000;
    const events: ToolEvent[] = [ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 4000 })];
    const v = buildNowView(events, status({ closedAt: 4500 }), now);
    expect(v.live).toBe(false);
  });

  it("returns an empty, not-live view for no events", () => {
    const v = buildNowView([], null, 1000);
    expect(v.live).toBe(false);
    expect(v.action).toBeNull();
    expect(v.steps).toEqual([]);
  });
});
