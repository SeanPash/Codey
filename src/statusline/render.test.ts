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

  it("numbers and phrases the current task, with the raw target above it", () => {
    const out = plain(renderStatus(base));
    const rawIdx = out.indexOf("C:\\proj\\temp-demo.txt");
    const taskIdx = out.indexOf("#15 Claude is removing the file temp-demo.txt");
    expect(rawIdx).toBeGreaterThan(-1);
    expect(taskIdx).toBeGreaterThan(-1);
    expect(rawIdx).toBeLessThan(taskIdx); // raw sits above task
  });

  it("marks prev rows as done with their number, separated by a divider", () => {
    const out = plain(renderStatus({
      ...base,
      prev: [
        { seq: 13, tag: "reading", target: "the file rules.md", raw: "rules.md" },
        { seq: 14, tag: "writing", target: "the file temp-demo.txt", raw: "temp-demo.txt" },
      ],
    }));
    expect(out).toContain("prev");
    expect(out).toContain("#13 reading the file rules.md");
    expect(out).toContain("#14 writing the file temp-demo.txt");
    expect(out).toContain("✓");
    expect(out).toContain("├"); // a divider rule between sections
  });

  it("points at the live task so the numbers read as an ordered checklist", () => {
    const out = plain(renderStatus({
      ...base,
      prev: [{ seq: 14, tag: "reading", target: "the file rules.md", raw: "rules.md" }],
    }));
    // done step keeps the check, the live step gets the pointer, aligned under it
    expect(out).toContain("✓ #14 reading the file rules.md");
    expect(out).toContain("▸ #15 Claude is removing the file temp-demo.txt");
  });

  it("shows the why in its own section when present", () => {
    const out = plain(renderStatus({ ...base, why: "cleaning up the demo file" }));
    expect(out).toContain("why");
    expect(out).toContain("cleaning up the demo file");
  });

  it("shows a warning in place of the why", () => {
    const out = plain(renderStatus({ ...base, why: "suppressed-why-body", warning: "stuck: same edit x3" }));
    expect(out).toContain("stuck: same edit x3");
    expect(out).not.toContain("why");
    expect(out).not.toContain("suppressed-why-body"); // the why body is hidden too, not just the label
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
    expect(out).toContain("#3–7 Claude is reading 5 files (a.ts, b.ts, +3)");
  });

  it("clamps a very long raw command to a single line with an ellipsis", () => {
    const longCmd = "gh pr create --base main --title " + "x".repeat(300);
    const out = plain(renderStatus({ ...base, current: { ...base.current!, raw: longCmd } }));
    const rawLine = out.split("\n").find((l) => l.includes("raw"))!;
    expect(rawLine).toBeDefined();
    expect(rawLine.length).toBeLessThan(100);
    expect(rawLine).toContain("…");
  });

  it("separates the raw detail from the task line with a divider", () => {
    const lines = plain(renderStatus(base)).split("\n");
    const rawIdx = lines.findIndex((l) => l.includes("raw"));
    const taskIdx = lines.findIndex((l) => l.includes("Claude is removing"));
    const between = lines.slice(rawIdx + 1, taskIdx);
    expect(between.some((l) => l.includes("├"))).toBe(true);
  });

  it("renders a finished-turn recap with a sentence and a done checklist", () => {
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
    expect(out).toContain("done"); // the recap section rule
    expect(out).toContain("steps"); // the checklist section rule
    expect(out).toContain("Opened PR #18 with the per-session fixes.");
    expect(out).toContain("✓ #1 asking you a question");
    expect(out).toContain("✓ #2 pushing the branch");
    expect(out).not.toContain("Claude is removing"); // the live task is replaced by the summary
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
