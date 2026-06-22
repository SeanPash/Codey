import { describe, it, expect } from "vitest";
import { groupThinking } from "./grouping.js";
import type { ReceiptLine } from "../types.js";

function line(p: Partial<ReceiptLine>): ReceiptLine {
  return { label: "", tool: "thinking", tokens: 0, status: "none", errorText: null, resolved: false,
    raw: null, why: null, failSummary: null, ...p };
}

describe("groupThinking", () => {
  it("collapses a run of thinking lines into one row labelled by what follows", () => {
    const out = groupThinking([
      line({ tokens: 10 }),
      line({ tokens: 20 }),
      line({ label: "Ran a command", tool: "Bash", tokens: 5, status: "ok" }),
    ]);
    expect(out).toEqual([
      { label: "Planned before ran a command", tool: "thinking", tokens: 30, status: "none", errorText: null, resolved: false, raw: null, why: null, failSummary: null },
      { label: "Ran a command", tool: "Bash", tokens: 5, status: "ok", errorText: null, resolved: false, raw: null, why: null, failSummary: null },
    ]);
  });

  it("labels a trailing thinking run generically and sums its tokens", () => {
    const out = groupThinking([line({ tokens: 7 }), line({ tokens: 3 })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ label: "Planned the next steps", tokens: 10, tool: "thinking" });
  });

  it("leaves non-thinking lines untouched", () => {
    const ls = [line({ label: "Reading a.ts", tool: "Read", tokens: 4, status: "ok" })];
    expect(groupThinking(ls)).toEqual(ls);
  });
});
