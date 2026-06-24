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

  it("names the literal target of the current step, so the strip is specific", () => {
    const bash: ToolEvent[] = [
      ev({ phase: "pre", tool: "Bash", input: { command: "mkdir -p out && cd out && echo hi" }, timestamp: 1000 }),
    ];
    expect(buildNowView(bash, null, 2000).action?.detail).toBe("mkdir -p out && cd out && echo hi");

    const read: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "/a/b/sessions.ts" }, timestamp: 1000 }),
    ];
    // A path collapses to its basename so the headline stays tight.
    expect(buildNowView(read, null, 2000).action?.detail).toBe("sessions.ts");
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

  it("bridges the brief gap between back-to-back tools, but only until the turn ends", () => {
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
    ];
    // Mid-work between two tools (Stop has not fired): a few seconds later it is still live.
    const bridge = buildNowView(events, status({}), 6500);
    expect(bridge.live).toBe(true);
    // Long after the last activity, with nothing fresh: the strip is done.
    expect(buildNowView(events, status({}), 61_500).live).toBe(false);
  });

  it("stays live mid-turn when Claude is reasoning between tools, past the short gap window", () => {
    // A tool ran, then a long pause while Claude thinks before the next one. No open call, the
    // last activity is well past the 15s gap window, but the turn is still in flight (prompt
    // newer than the last Stop). The strip must stay lit so it matches the page's "Working now".
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "a.ts" }, timestamp: 1000 }),
      ev({ phase: "post", tool: "Read", timestamp: 1500 }),
    ];
    const v = buildNowView(events, status({ promptAt: 1000 }), 40_000);
    expect(v.live).toBe(true);
    expect(v.action).toBeNull();
    expect(v.thinking).toBe(false);
  });

  it("goes quiet the instant Claude finishes the turn, not after the window", () => {
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 1000 }),
      ev({ phase: "post", tool: "Bash", timestamp: 1500 }),
    ];
    // Stop fired (doneAt newer than the last tool): live ends now, even within the 15s window.
    const v = buildNowView(events, status({ doneAt: 2000 }), 3000);
    expect(v.live).toBe(false);
    // The finished steps still show so the trail is not blank.
    expect(v.steps.length).toBe(1);
  });

  it("goes quiet when the user interrupted mid-tool, leaving a dangling open call", () => {
    // A cancel fires no Stop hook, so doneAt never lands and the open "pre" looks like a running
    // step. The transcript's interrupt timestamp, newer than every signal, ends the turn.
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 1000 }),
    ];
    const v = buildNowView(events, status({ promptAt: 500 }), 3000, Number.NEGATIVE_INFINITY, 2000);
    expect(v.live).toBe(false);
    expect(v.action).toBeNull();
  });

  it("stays live when the interrupt predates the current turn", () => {
    // An old cancel must not silence a fresh tool call that came after it.
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 5000 }),
    ];
    const v = buildNowView(events, status({}), 6000, Number.NEGATIVE_INFINITY, 2000);
    expect(v.live).toBe(true);
  });

  it("goes quiet after the turn ends even with a dangling open call from an errored tool", () => {
    // A tool that errors fires no PostToolUse, so its "pre" never gets a "post" and looks
    // open forever. Once the Stop hook stamps doneAt past every signal the turn is over, so
    // the strip must not treat that stale pre as a running step.
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "a.txt" }, timestamp: 1000 }),
      ev({ phase: "pre", tool: "Bash", input: { command: "ls" }, timestamp: 1100 }),
      ev({ phase: "post", tool: "Bash", timestamp: 1200 }),
    ];
    const v = buildNowView(events, status({ doneAt: 2000 }), 3000);
    expect(v.live).toBe(false);
    expect(v.action).toBeNull();
    // The trail still shows what did complete, so the strip is not blank.
    expect(v.steps.map((s) => s.label)).toEqual(["Listed the files here"]);
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

  it("scopes the strip to the current turn so a new prompt drops the old turn's trail at once", () => {
    const now = 30_000;
    // The previous turn ran two tools; then a new prompt arrived at 29s and nothing has run yet.
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Edit", input: { file_path: "old.ts" }, timestamp: 1000 }),
      ev({ phase: "post", tool: "Edit", timestamp: 1100 }),
      ev({ phase: "pre", tool: "Bash", input: { command: "npm test" }, timestamp: 1200 }),
      ev({ phase: "post", tool: "Bash", timestamp: 1300 }),
    ];
    const v = buildNowView(events, status({ promptAt: 29_000, doneAt: 1400 }), now, 29_000);
    // The new turn has no steps yet, so the "just did" trail from the old prompt is gone.
    expect(v.steps).toEqual([]);
    // It is thinking through the fresh prompt, not anchored to the old turn's last action.
    expect(v.thinking).toBe(true);
    expect(v.action).toBeNull();
    expect(v.since).toBe(29_000);
  });

  it("does not carry a dangling open call from a previous turn into the new one", () => {
    const now = 30_000;
    // An errored tool in the old turn left a "pre" with no "post"; the new prompt must not
    // show it as the step running now.
    const events: ToolEvent[] = [
      ev({ phase: "pre", tool: "Read", input: { file_path: "old.ts" }, timestamp: 1000 }),
    ];
    const v = buildNowView(events, status({ promptAt: 29_000 }), now, 29_000);
    expect(v.action).toBeNull();
    expect(v.thinking).toBe(true);
  });
});
