import { describe, it, expect } from "vitest";
import { composeView } from "./compose.js";
import { hasBannedPhrase } from "../caption/banned.js";
import type { ToolEvent } from "../types.js";
import type { StatusSnapshot } from "./state.js";

const pre = (id: string, tool: string, input: unknown, ts: number): ToolEvent => ({
  id,
  phase: "pre",
  tool,
  server: null,
  input,
  inputHash: id,
  isError: false,
  errorText: null,
  timestamp: ts,
  sessionId: "s1",
});

const snap = (over: Partial<StatusSnapshot> = {}): StatusSnapshot => ({
  mode: "deep",
  action: null,
  why: "the live why",
  warning: null,
  updatedAt: 0,
  ...over,
});

describe("composeView thinking", () => {
  it("is thinking when a prompt arrived after the last tool and we are caught up", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ promptAt: 100 }), 5000);
    expect(view.state).toBe("thinking");
    expect(view.stage).toBe("Thinking");
    expect(view.sentence).toContain("thinking about your request");
  });

  it("is not thinking once a newer tool event exists", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 200)];
    const view = composeView(events, snap({ promptAt: 100 }), 5000);
    expect(view.state).toBe("live");
  });
});

describe("composeView done", () => {
  it("recaps the finished prompt from its own events, not Claude's chat reply", () => {
    const events = [pre("a", "Edit", { file_path: "render.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: 200, why: "Some chatty closing message." }), 10000);
    expect(view.state).toBe("done");
    expect(view.stage).toBe("Done");
    expect(view.sentence).toMatch(/^Updated/);
    expect(view.sentence).toMatch(/render\.ts/);
    expect(view.sentence).not.toBe("Some chatty closing message.");
    // The closing footer always sits beneath the recap on a finished prompt.
    expect(view.hint).toBe("Run /codey:timeline for the full breakdown.");
  });

  it("recaps an investigate-only turn honestly, without claiming a change", () => {
    const events = [pre("a", "Read", { file_path: "index.html" }, 0)];
    const view = composeView(events, snap({ doneAt: 200, why: null }), 10000);
    expect(view.sentence).toMatch(/inspected/i);
    expect(view.sentence).not.toMatch(/updated|fixed/i);
    expect(view.hint).toBe("Run /codey:timeline for the full breakdown.");
  });

  it("snaps to done even before any reveal would have caught up", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0), pre("b", "Write", { file_path: "b.ts" }, 9000)];
    const view = composeView(events, snap({ doneAt: 9001, why: null }), 1000);
    expect(view.state).toBe("done");
  });

  it("is live while Claude is still working", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    expect(composeView(events, snap({ doneAt: null }), 1000).state).toBe("live");
  });

  it("drops the done state when a new prompt arrives after finishing", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: 50, promptAt: 100 }), 5000);
    expect(view.state).toBe("thinking");
  });
});

describe("composeView live phase", () => {
  it("leads the chip with the current purpose from the latest chunk", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Edit", { file_path: "b.ts" }, 100),
    ];
    const view = composeView(events, snap(), 1000);
    expect(view.state).toBe("live");
    expect(view.stage).toBe("Updating b.ts");
  });

  it("scopes the live phase to the current turn", () => {
    const events = [
      pre("a", "Edit", { file_path: "a.ts" }, 0), // previous turn
      pre("b", "Read", { file_path: "b.ts" }, 200), // this turn
    ];
    const view = composeView(events, snap({ promptAt: 150 }), 60000);
    expect(view.stage).toBe("Checking b.ts");
  });

  it("is idle with no events to show", () => {
    const view = composeView([], snap(), 1000);
    expect(view.state).toBe("idle");
    expect(view.stage).toBe("Idle");
  });

  it("uses the live why as the deep sentence in deep mode", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ mode: "deep", why: "Because the build ships compiled." }), 1000, []);
    expect(view.sentence).toBe("Because the build ships compiled.");
  });

  it("holds an older why until its read-time passes", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const whys = [
      { ts: 0, why: "first explanation here" },
      { ts: 100, why: "second explanation here" },
    ];
    expect(composeView(events, snap(), 1000, whys).sentence).toBe("first explanation here");
    expect(composeView(events, snap(), 5000, whys).sentence).toBe("second explanation here");
  });

  it("ignores a why from a previous turn so the explanation matches this turn's work", () => {
    const events = [pre("b", "Read", { file_path: "b.ts" }, 200)]; // this turn's tool
    const whys = [{ ts: 10, why: "explanation of the previous prompt" }]; // stamped before this turn
    // With the prior why scoped out, the deep sentence falls back to this turn's deterministic
    // caption instead of describing last turn's work under this turn's stage.
    const view = composeView(events, snap({ promptAt: 150, why: null }), 5000, whys);
    expect(view.sentence).not.toBe("explanation of the previous prompt");
    expect(view.sentence).toContain("Claude is reading");
  });

  it("drops to a complete deterministic sentence when the live why is too long to show whole", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const runOn = "Claude is investigating how the Codey narration system currently captures and tracks what you ask for so that later captions can refer to the real prompt instead of a generic file activity line and stay grounded in the work";
    const view = composeView(events, snap({ mode: "simple", why: runOn }), 1000, []);
    expect(view.sentence).not.toBe(runOn);
    expect(view.sentence).not.toMatch(/…$/);
    expect(view.sentence.endsWith(".")).toBe(true);
    expect(view.sentence).toContain("Claude is reading");
  });

  it("keeps a short live why whole rather than padding it", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ mode: "simple", why: "Claude is checking how Codey records prompts." }), 1000, []);
    expect(view.sentence).toBe("Claude is checking how Codey records prompts.");
  });

  it("makes deep mode meaningfully richer than simple for the same step, with no AI why", () => {
    const events = [pre("a", "Bash", { command: "git status" }, 0)];
    const simple = composeView(events, snap({ mode: "simple", why: null }), 1000, []);
    const deep = composeView(events, snap({ mode: "deep", why: null }), 1000, []);
    // Deep is not simple with a longer tail; it is a different, fuller sentence.
    expect(deep.sentence).not.toBe(simple.sentence);
    expect(deep.sentence.length).toBeGreaterThan(simple.sentence.length);
    // And it stays a complete thought: never cut off mid-sentence, never banned filler.
    expect(deep.sentence).not.toMatch(/…$/);
    expect(hasBannedPhrase(deep.sentence)).toBe(false);
    expect(hasBannedPhrase(simple.sentence)).toBe(false);
  });

  it("teach mode adds more than deep for the same step", () => {
    const events = [pre("a", "Bash", { command: "npm test" }, 0)];
    const deep = composeView(events, snap({ mode: "deep", why: null }), 1000, []);
    const teach = composeView(events, snap({ mode: "teach", why: null }), 1000, []);
    expect(teach.sentence.length).toBeGreaterThanOrEqual(deep.sentence.length);
    expect(hasBannedPhrase(teach.sentence)).toBe(false);
  });

  it("threads the budget-left label and stops spending the why when the cap is reached", () => {
    const events = [pre("1", "Read", { file_path: "a.ts" }, 10)];
    const view = composeView(events, snap({ mode: "deep", why: "old why" }), 1000, [], { cap: 5000, spent: 5000 });
    expect(view.budgetLeft).toBe("budget reached");
    expect(view.sentence).not.toBe("old why"); // paused: falls back to the free caption
    expect(view.hint).toContain("paused");
  });
});
