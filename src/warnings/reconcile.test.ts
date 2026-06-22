import { describe, it, expect } from "vitest";
import type { ToolEvent } from "../types.js";
import type { AssistantTurn } from "../timeline/transcript.js";
import { reconcileErrors } from "./reconcile.js";
import { detectRepeatError } from "./detectors.js";
import { computeOpenCalls } from "./open-calls.js";

function pre(id: string, tool: string, hash: string, ts: number): ToolEvent {
  return {
    id: `e-${id}`, phase: "pre", tool, server: null, input: { x: 1 },
    inputHash: hash, isError: false, errorText: null, timestamp: ts,
    sessionId: "s", toolUseId: id,
  };
}

function turn(toolUseId: string | null, tool: string, isError: boolean, errorText: string | null): AssistantTurn {
  return {
    ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool, input: null, isError, errorText, toolUseId, assistantText: null,
  };
}

describe("reconcileErrors", () => {
  it("synthesizes a post event for an errored turn matched to a pre by tool_use_id", () => {
    const events = [pre("t1", "Bash", "h1", 1000)];
    const turns = [turn("t1", "Bash", true, "exit code 1")];

    const out = reconcileErrors(events, turns);
    const posts = out.filter((e) => e.phase === "post");

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      phase: "post", tool: "Bash", inputHash: "h1", toolUseId: "t1",
      isError: true, errorText: "exit code 1", timestamp: 1000,
    });
  });

  it("ignores successful turns (those get a real post from the hook)", () => {
    const events = [pre("t1", "Bash", "h1", 1000)];
    const turns = [turn("t1", "Bash", false, null)];
    expect(reconcileErrors(events, turns)).toEqual(events);
  });

  it("ignores an errored turn with no matching captured pre", () => {
    const events = [pre("t1", "Bash", "h1", 1000)];
    const turns = [turn("t999", "Bash", true, "boom")];
    expect(reconcileErrors(events, turns)).toEqual(events);
  });

  it("does not duplicate a post that the hook already emitted", () => {
    const realPost: ToolEvent = { ...pre("t1", "Bash", "h1", 1000), phase: "post" };
    const events = [pre("t1", "Bash", "h1", 1000), realPost];
    const turns = [turn("t1", "Bash", true, "boom")];
    expect(reconcileErrors(events, turns).filter((e) => e.phase === "post")).toHaveLength(1);
  });

  it("no-ops on legacy events that lack a tool_use_id", () => {
    const legacy: ToolEvent = { ...pre("t1", "Bash", "h1", 1000), toolUseId: undefined };
    const turns = [turn("t1", "Bash", true, "boom")];
    expect(reconcileErrors([legacy], turns)).toEqual([legacy]);
  });

  it("makes repeat-error and open-call closing work for a run of identical failures", () => {
    const events = [
      pre("t1", "Bash", "h1", 1000),
      pre("t2", "Bash", "h1", 2000),
      pre("t3", "Bash", "h1", 3000),
    ];
    const turns = [
      turn("t1", "Bash", true, "exit code 1"),
      turn("t2", "Bash", true, "exit code 1"),
      turn("t3", "Bash", true, "exit code 1"),
    ];

    const out = reconcileErrors(events, turns);

    // repeat-error (threshold 3) now fires on the reconciled stream.
    const warn = detectRepeatError(out, 3);
    expect(warn?.kind).toBe("repeat_error");
    expect(warn?.count).toBe(3);

    // every failed call is now closed, so none look like a hang.
    expect(computeOpenCalls(out)).toHaveLength(0);
  });
});
