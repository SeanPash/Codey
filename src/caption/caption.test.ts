import { describe, it, expect } from "vitest";
import { buildCaption } from "./caption.js";
import type { WorkChunk } from "./chunks.js";

const chunk = (over: Partial<WorkChunk> = {}): WorkChunk => ({
  stage: "inspecting",
  index: 1,
  startIndex: 0,
  count: 1,
  tool: "Read",
  targets: ["render.ts"],
  raw: null,
  startTs: 0,
  endTs: 0,
  failed: false,
  resolved: false,
  ...over,
});

const NO_DASH = /[—–]/;

describe("buildCaption", () => {
  it("turns a shell test chunk into a plain-English sentence, not a command", () => {
    const c = buildCaption(chunk({ stage: "testing", tool: "Bash", targets: ["the tests"] }), "simple");
    expect(c.simple).toMatch(/Claude is running the tests/);
    expect(c.simple).not.toMatch(/npm|npx|vitest/);
  });

  it("uses the shell command's real purpose for a single shell action", () => {
    const c = buildCaption(chunk({ stage: "inspecting", tool: "Bash", count: 1, raw: "git status", targets: ["the local changes"] }), "deep");
    expect(c.title).toBe("Checking local changes");
    expect(c.simple).toBe("Claude is checking the local changes in the repository.");
    expect(c.deep).not.toMatch(/before changing anything/);
  });

  it("describes a run of reads as one inspection sentence", () => {
    const c = buildCaption(chunk({ stage: "inspecting", count: 4, targets: ["a.ts", "b.ts", "c.ts", "d.ts"] }), "simple");
    expect(c.simple).toMatch(/checking several/i);
    expect(c.stage).toBe("inspecting");
  });

  it("grows from simple to deep to teach", () => {
    const c = chunk({ stage: "editing", targets: ["statusline.ts"] });
    const simple = buildCaption(c, "simple");
    const deep = buildCaption(c, "deep");
    const teach = buildCaption(c, "teach");

    expect(simple.deep).toBeUndefined();
    expect(simple.teach).toBeUndefined();

    expect(deep.deep).toBeDefined();
    expect(deep.deep!.length).toBeGreaterThan(simple.simple.length);
    expect(deep.teach).toBeUndefined();

    expect(teach.teach).toBeDefined();
    expect(teach.teach!.length).toBeGreaterThan(deep.deep!.length);
  });

  it("prefers a real AI why for the sentence in simple mode", () => {
    const c = buildCaption(chunk(), "simple", "Claude is reading the build script before editing.");
    expect(c.simple).toBe("Claude is reading the build script before editing.");
  });

  it("uses the AI why for the deep field in deep mode, keeping a short simple line", () => {
    const c = buildCaption(chunk({ stage: "editing" }), "deep", "Because dist files ship compiled.");
    expect(c.deep).toBe("Because dist files ship compiled.");
    expect(c.simple).not.toBe("Because dist files ship compiled.");
  });

  it("ignores the AI why in ask mode, keeping only free deterministic labels", () => {
    const c = buildCaption(chunk(), "ask", "Some generated why.");
    expect(c.simple).not.toBe("Some generated why.");
    expect(c.deep).toBeUndefined();
  });

  it("reports an outcome when an action failed and recovered", () => {
    const c = buildCaption(chunk({ stage: "debugging", failed: true, resolved: true }), "deep");
    expect(c.outcome).toMatch(/recover/i);
  });

  it("strips em dashes from a generated why", () => {
    const c = buildCaption(chunk(), "simple", "Reading the script — it ships compiled.");
    expect(c.simple).not.toMatch(NO_DASH);
  });

  it("never emits em dashes in any deterministic field", () => {
    for (const stage of ["inspecting", "planning", "editing", "testing", "debugging", "summarizing", "waiting"] as const) {
      const c = buildCaption(chunk({ stage }), "teach");
      for (const v of [c.title, c.simple, c.deep, c.teach, c.outcome]) {
        if (v) expect(v).not.toMatch(NO_DASH);
      }
    }
  });
});
