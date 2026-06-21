import { describe, it, expect } from "vitest";
import { renderStatus } from "./render.js";
import type { StatusView } from "./view.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

const base: StatusView = {
  mode: "deep",
  current: { seq: 15, tag: "removing", target: "the file temp-demo.txt", raw: "C:\\proj\\temp-demo.txt" },
  prev: [],
  why: null,
  warning: null,
  thinking: false,
  summary: null,
};

describe("renderStatus", () => {
  it("shows a title-cased name and mode in the header", () => {
    const out = plain(renderStatus(base));
    expect(out).toContain("Codey");
    expect(out).toContain("Deep");
    expect(out).not.toContain("CODEY"); // not shouting
    expect(out).not.toContain("DEEP");
  });

  it("shows the current task with its raw command as an indented sub-line", () => {
    const out = plain(renderStatus(base));
    expect(out).toContain("Current task");
    expect(out).toContain("#15 removing temp-demo.txt");
    const taskIdx = out.indexOf("#15 removing temp-demo.txt");
    const rawIdx = out.indexOf("running  C:\\proj\\temp-demo.txt");
    expect(rawIdx).toBeGreaterThan(taskIdx); // raw sits UNDER the task now
  });

  it("lists previous tasks in past tense under their own section", () => {
    const out = plain(renderStatus({
      ...base,
      prev: [
        { seq: 13, tag: "reading", target: "the file rules.md", raw: "rules.md" },
        { seq: 14, tag: "writing", target: "the file temp-demo.txt", raw: "temp-demo.txt" },
      ],
    }));
    expect(out).toContain("Previous tasks");
    expect(out).toContain("✓ #13 read rules.md");
    expect(out).toContain("✓ #14 wrote temp-demo.txt");
  });

  it("points at the live task and shows finished ones in past tense", () => {
    const out = plain(renderStatus({
      ...base,
      prev: [{ seq: 14, tag: "reading", target: "the file rules.md", raw: "rules.md" }],
    }));
    expect(out).toContain("✓ #14 read rules.md");
    expect(out).toContain("▸ #15 removing temp-demo.txt");
  });

  it("shows the why under an Explanation section when present", () => {
    const out = plain(renderStatus({ ...base, why: "cleaning up the demo file" }));
    expect(out).toContain("Explanation");
    expect(out).toContain("cleaning up the demo file");
  });

  it("shows a Stuck section in place of the Explanation when warned", () => {
    const out = plain(renderStatus({ ...base, why: "suppressed-why-body", warning: "stuck: same edit x3" }));
    expect(out).toContain("Stuck");
    expect(out).toContain("stuck: same edit x3");
    expect(out).not.toContain("Explanation");
    expect(out).not.toContain("suppressed-why-body");
  });

  it("renders a waiting placeholder when there is no current card", () => {
    const out = plain(renderStatus({ mode: "simple", current: null, prev: [], why: null, warning: null, thinking: false, summary: null }));
    expect(out).toContain("Codey");
    expect(out).toContain("waiting for Claude");
  });

  it("shows a thinking line between a prompt and the first tool", () => {
    const out = plain(renderStatus({ ...base, thinking: true }));
    expect(out).toContain("thinking through your request");
    expect(out).not.toContain("removing"); // the live task is replaced by the thinking line
  });

  it("shows a range on the number when a card stands for a grouped burst", () => {
    const out = plain(renderStatus({
      ...base,
      current: { seq: 3, endSeq: 7, tag: "reading", target: "5 files (a.ts, b.ts, +3)", raw: null },
    }));
    expect(out).toContain("#3–7 reading 5 files (a.ts, b.ts, +3)");
  });

  it("clamps a very long raw command to a single line with an ellipsis", () => {
    const longCmd = "gh pr create --base main --title " + "x".repeat(300);
    const out = plain(renderStatus({ ...base, current: { ...base.current!, raw: longCmd } }));
    const rawLine = out.split("\n").find((l) => l.includes("running") && l.includes("gh pr create"))!;
    expect(rawLine).toBeDefined();
    expect(rawLine.length).toBeLessThan(100);
    expect(rawLine).toContain("…");
  });

  it("omits the raw sub-line when the current card has no raw", () => {
    const out = plain(renderStatus({ ...base, current: { ...base.current!, raw: null } }));
    expect(out).toContain("#15 removing temp-demo.txt");
    expect(out).not.toContain("↳ running");
  });

  it("renders a finished-turn recap with a sentence and a completed-tasks checklist", () => {
    const out = plain(renderStatus({
      ...base,
      summary: {
        sentence: "Opened PR #18 with the per-session fixes.",
        items: [
          { seq: 1, tag: "asking", target: "you a question", raw: null },
          { seq: 2, tag: "pushing", target: "the branch", raw: null },
        ],
      },
    }));
    expect(out).toContain("summary"); // the recap section rule
    expect(out).toContain("completed tasks"); // the checklist section rule
    expect(out).toContain("Opened PR #18 with the per-session fixes.");
    expect(out).toContain("✓ #1 asking you a question");
    expect(out).toContain("✓ #2 pushing the branch");
    expect(out).not.toContain("Claude is removing"); // the live task is replaced by the summary
  });

  it("centers the recap sentence and the completed-task rows in the box", () => {
    const lines = plain(renderStatus({
      ...base,
      summary: {
        sentence: "Opened PR #18 with the per-session fixes.",
        items: [{ seq: 1, tag: "asking", target: "you a question", raw: null }],
      },
    })).split("\n");
    const sentenceLine = lines.find((l) => l.includes("Opened PR #18"))!;
    const taskLine = lines.find((l) => l.includes("asking you a question"))!;
    // centered lines carry leading padding past the bar, not flush like the live rows
    expect(sentenceLine).toMatch(/│\s{3,}Opened/);
    expect(taskLine).toMatch(/│\s{3,}✓/);
  });

  it("frames the card and closes the corner", () => {
    const out = plain(renderStatus(base));
    expect(out.startsWith("╭")).toBe(true);
    expect(out.trimEnd().endsWith("╰")).toBe(true);
  });

  it("colors the frame differently per mode", () => {
    const simple = renderStatus({ ...base, mode: "simple" });
    const deep = renderStatus({ ...base, mode: "deep" });
    expect(simple).not.toEqual(deep);
  });
});
