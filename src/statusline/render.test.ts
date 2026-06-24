import { describe, it, expect } from "vitest";
import { renderStatus } from "./render.js";
import type { StatusView } from "./view.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

const base: StatusView = {
  mode: "deep",
  state: "live",
  stage: "Editing",
  sentence: "Claude is editing the statusline so live actions read like plain English.",
  elapsed: "42s",
  warning: null,
  budgetLeft: null,
  hint: null,
};

describe("renderStatus", () => {
  it("renders a two-line HUD: a status bar then the sentence", () => {
    const lines = plain(renderStatus(base)).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Codey");
    expect(lines[0]).toContain("Deep");
    expect(lines[0]).toContain("Editing");
    expect(lines[0]).toContain("42s");
    expect(lines[1]).toContain("Claude is editing the statusline");
  });

  it("uses a calm Title Case name and mode, not shouting", () => {
    const out = plain(renderStatus(base));
    expect(out).not.toContain("CODEY");
    expect(out).not.toContain("DEEP");
  });

  it("never shows a token count on the status line", () => {
    const out = plain(renderStatus({ ...base, budgetLeft: "3.8k left", sentence: "Claude is checking the build." }));
    expect(out).not.toMatch(/\b\d+\s*tokens?\b/i);
    expect(out).not.toMatch(/\btok\b/i);
  });

  it("aligns the done state cleanly: name, Done, final time, then a recap", () => {
    const out = plain(renderStatus({
      ...base,
      state: "done",
      stage: "Done",
      sentence: "Finished this prompt. Open the timeline for the full breakdown.",
      elapsed: "2m 14s",
      hint: "/codey:timeline · /codey:costs",
    }));
    const lines = out.split("\n");
    expect(lines[0]).toContain("Codey");
    expect(lines[0]).toContain("Done");
    expect(lines[0]).toContain("2m 14s");
    expect(lines[0]).not.toContain("Deep"); // the mode drops away on the close
    expect(lines[1]).toContain("Finished this prompt.");
    expect(out).toContain("/codey:timeline");
  });

  it("shows a thinking line between a prompt and the first tool", () => {
    const out = plain(renderStatus({ ...base, state: "thinking", stage: "Thinking", sentence: "Claude is thinking through your request." }));
    expect(out).toContain("Thinking");
    expect(out).toContain("thinking through your request");
  });

  it("lets a stuck warning take over the second line", () => {
    const out = plain(renderStatus({ ...base, warning: "stuck: same edit x3" }));
    const lines = out.split("\n");
    expect(lines[1]).toContain("stuck: same edit x3");
    expect(lines[1]).not.toContain("editing the statusline");
  });

  it("shows the budget-left cue on the status bar", () => {
    const out = plain(renderStatus({ ...base, budgetLeft: "3.8k left" }));
    expect(out.split("\n")[0]).toContain("3.8k left");
  });

  it("shows a dim hint line for ask mode", () => {
    const out = plain(renderStatus({ ...base, mode: "ask", hint: "/codey:explain for the why" }));
    expect(out).toContain("/codey:explain for the why");
  });

  it("colors the bar differently per mode", () => {
    expect(renderStatus({ ...base, mode: "simple" })).not.toEqual(renderStatus({ ...base, mode: "deep" }));
  });

  it("clips a long stage chip at a word boundary so the header stays tidy", () => {
    const longStage = "Updating the math tests to cover the brand new edge-case behavior";
    const lines = plain(renderStatus({ ...base, stage: longStage })).split("\n");
    // The chip keeps the opening words, ends in an ellipsis, and drops the tail.
    expect(lines[0]).toContain("Updating the math tests");
    expect(lines[0]).toContain("…");
    expect(lines[0]).not.toContain("edge-case behavior");
    // It cuts on a space, so the last visible word is whole ("cover", not "cove").
    expect(lines[0]).toContain("cover…");
    // A short stage is left exactly as-is.
    expect(plain(renderStatus({ ...base, stage: "Editing" })).split("\n")[0]).toContain("Editing");
    expect(plain(renderStatus({ ...base, stage: "Editing" }))).not.toContain("…");
  });

  it("wraps a long sentence instead of spilling past the width", () => {
    const long = "Claude is working through " + "several connected files ".repeat(8) + "to finish the change.";
    const lines = plain(renderStatus({ ...base, sentence: long }, 60)).split("\n");
    expect(lines.length).toBeGreaterThan(2);
    for (const ln of lines) expect(ln.length).toBeLessThanOrEqual(60);
  });
});
