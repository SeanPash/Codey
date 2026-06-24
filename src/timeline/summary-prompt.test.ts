import { describe, it, expect } from "vitest";
import { buildSummaryPrompt, type SummaryTask } from "./summary-prompt.js";
import type { ExplainDepth } from "./explain-prompt.js";
import type { ReceiptLine } from "../types.js";

function line(why: string): ReceiptLine {
  return {
    label: "Editing budget.ts", title: "Updating budget.ts", subtitle: "Changing budget.ts to adjust how it works.",
    tool: "Edit", tokens: 50, status: "ok", errorText: null,
    resolved: false, raw: "src/budget/budget.ts", why, failSummary: null, ts: 1, thoughtFirst: false,
  };
}

function bashLine(command: string): ReceiptLine {
  return {
    label: "Running the tests", title: "Verifying the tests", subtitle: "Running the tests to check it passes.",
    tool: "Bash", tokens: 10, status: "ok", errorText: null,
    resolved: false, raw: command, why: "checking the work", failSummary: null, ts: 2, thoughtFirst: false,
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

  it("grounds the recap in the real files that were changed", () => {
    const p = buildSummaryPrompt("do the thing", tasks, "deep");
    expect(p).toContain("budget.ts");
    expect(p.toLowerCase()).toContain("files touched");
  });

  it("asks deep and teach for honest sections, but keeps simple to one sentence", () => {
    const deep = buildSummaryPrompt("p", tasks, "deep");
    expect(deep).toContain("What changed");
    expect(deep).toContain("Files touched");
    expect(deep).toContain("Verification");
    const simple = buildSummaryPrompt("p", tasks, "simple");
    expect(simple).not.toContain("What changed");
  });

  it("only offers verification as grounding when a check actually ran", () => {
    const verified: SummaryTask[] = [
      { name: "Fix the recap", lines: [line("the change"), bashLine("npx vitest run")] },
    ];
    const withCheck = buildSummaryPrompt("p", verified, "deep");
    expect(withCheck.toLowerCase()).toMatch(/the tests/);

    const noCheck = buildSummaryPrompt("p", tasks, "deep");
    // With no check in the evidence, the prompt tells the model not to invent one.
    expect(noCheck.toLowerCase()).toContain("only");
  });
});
