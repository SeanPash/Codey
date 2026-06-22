import { describe, it, expect } from "vitest";
import { buildTaskExplainPrompt, buildActionExplainPrompt, type ExplainDepth } from "./explain-prompt.js";
import type { ReceiptLine } from "../types.js";

function line(over: Partial<ReceiptLine> = {}): ReceiptLine {
  return {
    label: "Writing server.ts",
    tool: "Write",
    tokens: 100,
    status: "ok",
    errorText: null,
    resolved: false,
    raw: "src/serve/server.ts",
    why: "I'll add the route so the page can fetch explanations.",
    failSummary: null,
    ts: 1000,
    ...over,
  };
}

const DEPTHS: ExplainDepth[] = ["simple", "deep", "teach"];

describe("buildTaskExplainPrompt", () => {
  it("includes the task name and the reasoning behind each action", () => {
    const p = buildTaskExplainPrompt("Add the explain endpoint", [line()], "deep");
    expect(p).toContain("Add the explain endpoint");
    expect(p).toContain("I'll add the route so the page can fetch explanations.");
    expect(p).toContain("Writing server.ts");
  });

  it("asks for the goal, not a list of tools", () => {
    const p = buildTaskExplainPrompt("X", [line()], "deep");
    expect(p.toLowerCase()).toContain("do not list the tools");
  });

  it("varies the instruction by depth", () => {
    const [simple, deep, teach] = DEPTHS.map((d) => buildTaskExplainPrompt("X", [line()], d));
    expect(simple).not.toEqual(deep);
    expect(deep).not.toEqual(teach);
    expect(simple.toLowerCase()).toContain("one");
    expect(teach.toLowerCase()).toContain("teach");
  });

  it("never uses em dashes in any depth", () => {
    for (const d of DEPTHS) expect(buildTaskExplainPrompt("X", [line()], d)).not.toContain("—");
  });

  it("surfaces a failure so the explanation can address it", () => {
    const p = buildTaskExplainPrompt("X", [line({ status: "fail", failSummary: "This command failed (exit code 1)." })], "deep");
    expect(p).toContain("This command failed (exit code 1).");
  });

  it("forbids asking the user for more context", () => {
    const p = buildTaskExplainPrompt("X", [line()], "deep").toLowerCase();
    expect(p).toContain("never ask the user");
  });

  it("frames the task name as Codey's guess, not the agent's goal", () => {
    const p = buildTaskExplainPrompt("Checking git history", [line()], "deep").toLowerCase();
    expect(p).toContain("rough guess");
    expect(p).toContain("do not claim the agent did the wrong thing");
  });
});

describe("buildActionExplainPrompt", () => {
  it("scopes the prompt to one action and its reasoning", () => {
    const p = buildActionExplainPrompt(line(), "deep");
    expect(p).toContain("Writing server.ts");
    expect(p).toContain("I'll add the route so the page can fetch explanations.");
  });

  it("varies by depth and avoids em dashes", () => {
    for (const d of DEPTHS) {
      const p = buildActionExplainPrompt(line(), d);
      expect(p).not.toContain("—");
    }
    expect(buildActionExplainPrompt(line(), "teach").toLowerCase()).toContain("teach");
  });

  it("forbids asking the user for more context", () => {
    expect(buildActionExplainPrompt(line(), "deep").toLowerCase()).toContain("never ask the user");
  });

  it("frames a thinking step as reasoning, not a command, so it never asks what ran", () => {
    const p = buildActionExplainPrompt(line({ tool: "thinking", label: "Thought it through, then ran a command", raw: null }), "deep");
    expect(p.toLowerCase()).toContain("paused to reason");
  });
});
