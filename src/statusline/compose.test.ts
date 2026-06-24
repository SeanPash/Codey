import { describe, it, expect } from "vitest";
import { composeView, cardsFromEvents } from "./compose.js";
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

describe("cardsFromEvents", () => {
  it("numbers pre events and skips post events", () => {
    const events: ToolEvent[] = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      { ...pre("a2", "Read", {}, 1), phase: "post" },
      pre("b", "Write", { file_path: "b.ts" }, 2),
    ];
    const cards = cardsFromEvents(events);
    expect(cards.map((c) => c.seq)).toEqual([1, 2]);
    expect(cards[1].raw).toBe("b.ts");
  });

  it("folds a rapid run of the same action into one counted card", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Read", { file_path: "b.ts" }, 200),
      pre("c", "Read", { file_path: "c.ts" }, 400),
    ];
    const cards = cardsFromEvents(events);
    expect(cards).toHaveLength(1);
    expect(cards[0].seq).toBe(1);
    expect(cards[0].endSeq).toBe(3);
    expect(cards[0].action.target).toBe("3 files (a.ts, b.ts, +1)");
  });

  it("keeps spaced-out steps as separate cards", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Read", { file_path: "b.ts" }, 9000), // well past the burst window
    ];
    const cards = cardsFromEvents(events);
    expect(cards.map((c) => c.seq)).toEqual([1, 2]);
  });

  it("does not group across different actions", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Write", { file_path: "b.ts" }, 100),
    ];
    expect(cardsFromEvents(events)).toHaveLength(2);
  });
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
  it("shows the AI recap as the done sentence and points at the fuller views", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: 200, why: "Wired the summary section." }), 10000);
    expect(view.state).toBe("done");
    expect(view.stage).toBe("Done");
    expect(view.sentence).toBe("Wired the summary section.");
    expect(view.hint).toContain("/codey:timeline");
  });

  it("falls back to a clean generic line when there is no recap", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: 200, why: null }), 10000);
    expect(view.sentence).toBe("Finished this prompt. Open the timeline for the full breakdown.");
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

  it("ask mode keeps a free deterministic caption and points at the explain command", () => {
    const events = [pre("1", "Read", { file_path: "a.ts" }, 10)];
    const view = composeView(events, snap({ mode: "ask", why: "an AI why" }), 1000, []);
    expect(view.sentence).not.toBe("an AI why");
    expect(view.sentence).toContain("Claude is reading");
    expect(view.hint).toBe("/codey:explain for the why");
  });

  it("threads the budget-left label and stops spending the why when the cap is reached", () => {
    const events = [pre("1", "Read", { file_path: "a.ts" }, 10)];
    const view = composeView(events, snap({ mode: "deep", why: "old why" }), 1000, [], { cap: 5000, spent: 5000 });
    expect(view.budgetLeft).toBe("budget reached");
    expect(view.sentence).not.toBe("old why"); // paused: falls back to the free caption
    expect(view.hint).toContain("paused");
  });
});
