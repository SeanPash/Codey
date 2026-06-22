import { describe, it, expect } from "vitest";
import { buildSummaryPrompt, type SummaryTask } from "./summary-prompt.js";
import type { ExplainDepth } from "./explain-prompt.js";
import type { ReceiptLine } from "../types.js";

function line(why: string): ReceiptLine {
  return {
    label: "Editing budget.ts", tool: "Edit", tokens: 50, status: "ok", errorText: null,
    resolved: false, raw: "src/budget/budget.ts", why, failSummary: null, ts: 1, thoughtFirst: false,
  };
}

const tasks: SummaryTask[] = [
  { name: "Add the explain endpoint", lines: [line("wiring the route")] },
  { name: "Cache the results", lines: [line("avoid paying twice")] },
];

const DEPTHS: ExplainDepth[] = ["simple", "deep", "teach"];

describe("buildSummaryPrompt", () => {
  it("includes the user's prompt and the task names", () => {
    const p = buildSummaryPrompt("add explanations to the timeline", tasks, "deep");
    expect(p).toContain("add explanations to the timeline");
    expect(p).toContain("Add the explain endpoint");
    expect(p).toContain("Cache the results");
  });

  it("frames the answer as a recap of what was accomplished", () => {
    const p = buildSummaryPrompt("do the thing", tasks, "deep").toLowerCase();
    expect(p).toMatch(/accomplish|recap|summar|what claude did|got done/);
  });

  it("varies by depth and never uses em dashes", () => {
    const out = DEPTHS.map((d) => buildSummaryPrompt("p", tasks, d));
    expect(out[0]).not.toEqual(out[1]);
    for (const p of out) expect(p).not.toContain("—");
  });
});
