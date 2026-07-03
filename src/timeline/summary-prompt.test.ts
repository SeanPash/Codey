import { describe, it, expect } from "vitest";
import { buildSummaryPrompt, type SummaryTask } from "./summary-prompt.js";
import type { ExplainDepth } from "./explain-prompt.js";
import type { ReceiptLine } from "../types.js";

function line(why: string): ReceiptLine {
  return {
    label: "Editing budget.ts", title: "Updating budget.ts", subtitle: "Changing budget.ts to adjust how it works.",
    tool: "Edit", tokens: 50, status: "ok", errorText: null,
    resolved: false, raw: "src/budget/budget.ts", why, evidence: null, failSummary: null, ts: 1, thoughtFirst: false,
  };
}

function fileLine(path: string): ReceiptLine {
  return { ...line("editing"), raw: path };
}

function bashLine(command: string): ReceiptLine {
  return {
    label: "Running the tests", title: "Verifying the tests", subtitle: "Running the tests to check it passes.",
    tool: "Bash", tokens: 10, status: "ok", errorText: null,
    resolved: false, raw: command, why: "checking the work", evidence: null, failSummary: null, ts: 2, thoughtFirst: false,
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

  it("asks deep and teach to note what is left when the work is unfinished", () => {
    for (const d of ["deep", "teach"] as const) {
      const p = buildSummaryPrompt("p", tasks, d).toLowerCase();
      expect(p).toMatch(/what(?:'s| is)? left|remain|still open|unfinished/);
    }
  });

  it("tells deep and teach not to just echo Claude's closing chat message", () => {
    const p = buildSummaryPrompt("p", tasks, "deep").toLowerCase();
    expect(p).toMatch(/do not (just )?(repeat|echo|copy)/);
  });

  it("makes the teach concept teach a real technique with an analogy, not a trivial term", () => {
    const p = buildSummaryPrompt("p", tasks, "teach").toLowerCase();
    expect(p).toContain("technique, tool, or skill");
    expect(p).toContain("everyday analogy");
    expect(p).toContain("not a basic term the reader already knows");
  });

  it("scales the What changed detail with how many files the prompt touched, in budget mode", () => {
    const small = buildSummaryPrompt("p", [{ name: "tweak", lines: [fileLine("src/a.ts")] }], "deep", false);
    expect(small).not.toMatch(/three to five/);

    const manyFiles = Array.from({ length: 9 }, (_, i) => fileLine(`src/file${i}.ts`));
    const big = buildSummaryPrompt("p", [{ name: "overhaul", lines: manyFiles }], "deep", false);
    expect(big).toMatch(/three to five/);
    // teach scales the same way
    const bigTeach = buildSummaryPrompt("p", [{ name: "overhaul", lines: manyFiles }], "teach", false);
    expect(bigTeach).toMatch(/three to five/);
  });

  it("asks for a markedly longer What changed walkthrough in rich mode than budget", () => {
    const manyFiles = Array.from({ length: 9 }, (_, i) => fileLine(`src/file${i}.ts`));
    const budget = buildSummaryPrompt("p", [{ name: "overhaul", lines: manyFiles }], "deep", false);
    const rich = buildSummaryPrompt("p", [{ name: "overhaul", lines: manyFiles }], "deep", true);
    expect(budget).toMatch(/three to five/);
    expect(rich).toMatch(/six to ten/);
    expect(rich.toLowerCase()).toContain("walk through");
  });

  it("gives the secondary sections more room in rich mode than budget", () => {
    const budget = buildSummaryPrompt("p", tasks, "deep", false);
    const rich = buildSummaryPrompt("p", tasks, "deep", true);
    expect(budget).toContain("one or two plain sentences");
    expect(rich).toContain("one to three plain sentences");
  });

  it("in rich mode, feeds the concrete change substance so the recap names the real change", () => {
    const editLine: ReceiptLine = { ...line("renaming the class"), evidence: 'replaced ".sw {" with ".stgl {"' };
    const p = buildSummaryPrompt("fix toggles", [{ name: "Rename", lines: [editLine] }], "deep", true);
    expect(p).toContain(".stgl");
  });

  it("in budget mode, omits the concrete change substance to stay cheap", () => {
    const editLine: ReceiptLine = { ...line("renaming the class"), evidence: 'replaced ".sw {" with ".stgl {"' };
    const p = buildSummaryPrompt("fix toggles", [{ name: "Rename", lines: [editLine] }], "deep", false);
    expect(p).not.toContain(".stgl");
  });

  it("in rich mode, asks the recap to name the specific identifiers and root cause", () => {
    const p = buildSummaryPrompt("p", tasks, "deep", true).toLowerCase();
    expect(p).toMatch(/name the (actual|real|specific)/);
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
