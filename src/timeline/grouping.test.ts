import { describe, it, expect } from "vitest";
import { groupThinking } from "./grouping.js";
import type { ReceiptLine } from "../types.js";

function line(p: Partial<ReceiptLine>): ReceiptLine {
  return { label: "", tool: "thinking", tokens: 0, status: "none", errorText: null, resolved: false,
    raw: null, why: null, failSummary: null, ts: 0, ...p };
}

describe("groupThinking", () => {
  it("collapses a run of thinking lines into one natural-language row", () => {
    const out = groupThinking([
      line({ tokens: 10, ts: 100 }),
      line({ tokens: 20, ts: 200 }),
      line({ label: "Ran a command", tool: "Bash", tokens: 5, status: "ok", ts: 300 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].tool).toBe("thinking");
    expect(out[0].tokens).toBe(30);
    expect(out[0].ts).toBe(100);
    // must NOT use the old "Planned before" wording
    expect(out[0].label).not.toContain("Planned before");
    // must read naturally (e.g. "Thought it through, then ran a command")
    expect(out[0].label.toLowerCase()).toContain("ran a command");
  });

  it("carries the following line why onto the thinking row", () => {
    const out = groupThinking([
      line({ tokens: 5, ts: 10 }),
      line({ label: "Ran a command", tool: "Bash", tokens: 3, status: "ok", ts: 20, why: "Need to build before testing." }),
    ]);
    expect(out[0].why).toBe("Need to build before testing.");
  });

  it("labels a trailing thinking run with a plain fallback sentence", () => {
    const out = groupThinking([line({ tokens: 7 }), line({ tokens: 3 })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ tokens: 10, tool: "thinking" });
    expect(out[0].label).not.toContain("Planned");
    expect(out[0].label.toLowerCase()).toContain("thought");
  });

  it("leaves non-thinking lines untouched", () => {
    const ls = [line({ label: "Reading a.ts", tool: "Read", tokens: 4, status: "ok" })];
    expect(groupThinking(ls)).toEqual(ls);
  });
});
