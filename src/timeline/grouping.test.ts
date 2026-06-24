import { describe, it, expect } from "vitest";
import { groupThinking } from "./grouping.js";
import type { ReceiptLine } from "../types.js";

function line(p: Partial<ReceiptLine>): ReceiptLine {
  return { label: "", title: "Thinking it through", subtitle: "Working through the approach before acting.",
    tool: "thinking", tokens: 0, status: "none", errorText: null, resolved: false,
    raw: null, why: null, failSummary: null, ts: 0, thoughtFirst: false, ...p };
}

describe("groupThinking", () => {
  it("folds a run of thinking into the action that follows it", () => {
    const out = groupThinking([
      line({ tokens: 10, ts: 100 }),
      line({ tokens: 20, ts: 200 }),
      line({ label: "Ran a command", tool: "Bash", tokens: 5, status: "ok", ts: 300 }),
    ]);
    // One row: the action, with the thinking tokens absorbed and no separate think row.
    expect(out).toHaveLength(1);
    expect(out[0].tool).toBe("Bash");
    expect(out[0].label).toBe("Ran a command");
    expect(out[0].tokens).toBe(35);
    expect(out[0].thoughtFirst).toBe(true);
  });

  it("keeps the action's own why when folding thinking into it", () => {
    const out = groupThinking([
      line({ tokens: 5, ts: 10 }),
      line({ label: "Ran a command", tool: "Bash", tokens: 3, status: "ok", ts: 20, why: "Need to build before testing." }),
    ]);
    expect(out[0].why).toBe("Need to build before testing.");
    expect(out[0].thoughtFirst).toBe(true);
  });

  it("keeps a trailing thinking run as its own plain row when no action follows", () => {
    const out = groupThinking([line({ tokens: 7 }), line({ tokens: 3 })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tokens: 10, tool: "thinking", thoughtFirst: false });
    expect(out[0].label.toLowerCase()).toContain("thought");
  });

  it("leaves non-thinking lines untouched", () => {
    const ls = [line({ label: "Reading a.ts", tool: "Read", tokens: 4, status: "ok" })];
    expect(groupThinking(ls)).toEqual(ls);
  });

  it("does not set thoughtFirst on an action with no preceding thinking", () => {
    const out = groupThinking([line({ label: "Reading a.ts", tool: "Read", tokens: 4, status: "ok" })]);
    expect(out[0].thoughtFirst).toBe(false);
  });
});
