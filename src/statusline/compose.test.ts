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
    const view = composeView(events, snap({ promptAt: 100 }), 5000, 4500);
    expect(view.thinking).toBe(true);
    expect(view.why).toBeNull(); // the why is held back while thinking
  });

  it("is not thinking once a newer tool event exists", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 200)];
    const view = composeView(events, snap({ promptAt: 100 }), 5000, 4500);
    expect(view.thinking).toBe(false);
  });
});

describe("composeView summary", () => {
  it("builds a summary with the narrator sentence and a done checklist when finished", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Write", { file_path: "b.ts" }, 100),
    ];
    // doneAt lands after the last tool event and we are caught up
    const view = composeView(events, snap({ doneAt: 200, why: "Wired the summary section." }), 10000, 4500);
    expect(view.summary?.sentence).toBe("Wired the summary section.");
    expect(view.summary?.items.map((i) => i.seq)).toEqual([1, 2]);
  });

  it("keeps only the last three completed cards in the checklist", () => {
    const events = [
      pre("a", "Read", { file_path: "a.ts" }, 0),
      pre("b", "Write", { file_path: "b.ts" }, 9000),
      pre("c", "Edit", { file_path: "c.ts" }, 18000),
      pre("d", "Read", { file_path: "d.ts" }, 27000),
    ];
    const view = composeView(events, snap({ doneAt: 40000 }), 60000, 4500);
    expect(view.summary?.items.map((i) => i.seq)).toEqual([2, 3, 4]);
  });

  it("has no summary while Claude is still working", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: null }), 1000, 4500);
    expect(view.summary).toBeNull();
  });

  it("drops the summary when a new prompt arrives after finishing", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap({ doneAt: 50, promptAt: 100 }), 5000, 4500);
    expect(view.summary).toBeNull();
    expect(view.thinking).toBe(true);
  });
});

describe("composeView", () => {
  it("hides the why while catching up to an older card", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0), pre("b", "Write", { file_path: "b.ts" }, 0)];
    const view = composeView(events, snap(), 1000, 4500); // still on card 1
    expect(view.current?.seq).toBe(1);
    expect(view.why).toBeNull();
  });

  it("shows the why once the latest card is displayed", () => {
    const events = [pre("a", "Read", { file_path: "a.ts" }, 0)];
    const view = composeView(events, snap(), 1000, 4500);
    expect(view.current?.seq).toBe(1);
    expect(view.why).toBe("the live why");
    expect(view.mode).toBe("deep");
  });
});
