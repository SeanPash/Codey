import { describe, it, expect } from "vitest";
import { buildCaption } from "./caption.js";
import { hasBannedPhrase } from "./banned.js";
import type { WorkChunk } from "./chunks.js";

const chunk = (over: Partial<WorkChunk> = {}): WorkChunk => ({
  stage: "inspecting",
  index: 1,
  startIndex: 0,
  count: 1,
  tool: "Read",
  targets: ["render.ts"],
  searches: [],
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

  it("names the files in a run of reads instead of saying several files", () => {
    const c = buildCaption(chunk({ stage: "inspecting", count: 4, targets: ["a.ts", "b.ts", "c.ts", "d.ts"] }), "simple");
    expect(c.simple).toMatch(/a\.ts/);
    expect(c.simple).toMatch(/b\.ts/);
    expect(hasBannedPhrase(c.simple)).toBe(false);
    expect(c.stage).toBe("inspecting");
  });

  it("turns a search-then-read run into a caption that names what it looked for", () => {
    const c = buildCaption(
      chunk({
        stage: "inspecting",
        tool: "Grep",
        count: 3,
        searches: ["TOKEN BREAKDOWN", "Active Terminal"],
        targets: ["index.html"],
      }),
      "deep",
    );
    expect(c.simple).toMatch(/index\.html/);
    expect(c.simple).toMatch(/token breakdown/i);
    expect(c.simple).toMatch(/active terminal/i);
    expect(c.deep).toMatch(/token breakdown/i);
    expect(hasBannedPhrase(c.simple)).toBe(false);
    expect(hasBannedPhrase(c.deep!)).toBe(false);
  });

  it("names a search even when no file is read yet", () => {
    const c = buildCaption(
      chunk({ stage: "inspecting", tool: "Grep", count: 2, searches: ["Follow Live"], targets: [] }),
      "simple",
    );
    expect(c.simple).toMatch(/follow live/i);
    expect(hasBannedPhrase(c.simple)).toBe(false);
  });

  it("names both files in the title when exactly two are touched", () => {
    const c = buildCaption(
      chunk({ stage: "editing", tool: "Edit", count: 2, targets: ["caption.ts", "render.ts"] }),
      "deep",
    );
    expect(c.title).toBe("Updating caption.ts and render.ts");
  });

  it("names the shared files when editing several at once, not several related files", () => {
    const c = buildCaption(
      chunk({ stage: "editing", tool: "Edit", count: 2, targets: ["caption.ts", "render.ts"] }),
      "deep",
    );
    expect(c.simple).toMatch(/caption\.ts/);
    expect(c.simple).toMatch(/render\.ts/);
    expect(hasBannedPhrase(c.simple)).toBe(false);
    expect(hasBannedPhrase(c.deep!)).toBe(false);
  });

  it("names both the test and source files when editing a behavior across them", () => {
    const c = buildCaption(
      chunk({ stage: "editing", tool: "Edit", count: 2, targets: ["caption.test.ts", "caption.ts"] }),
      "simple",
    );
    expect(c.simple).toMatch(/caption tests/);
    expect(c.simple).toMatch(/caption\.ts/);
    expect(hasBannedPhrase(c.simple)).toBe(false);
  });

  it("gives deep mode more context than simple mode for a multi-file read", () => {
    const c = chunk({ stage: "inspecting", count: 3, targets: ["a.ts", "b.ts", "c.ts"] });
    const simple = buildCaption(c, "simple");
    const deep = buildCaption(c, "deep");
    expect(deep.deep!.length).toBeGreaterThan(simple.simple.length);
  });

  it("teach mode adds a short concept explanation on top of deep", () => {
    const c = chunk({ stage: "inspecting", count: 3, targets: ["a.ts", "b.ts", "c.ts"] });
    const deep = buildCaption(c, "deep");
    const teach = buildCaption(c, "teach");
    expect(teach.teach!.length).toBeGreaterThan(deep.deep!.length);
    // The concept line is a second sentence, not just a longer first one.
    expect(teach.teach!.split(/\.\s/).length).toBeGreaterThan(deep.deep!.split(/\.\s/).length);
  });

  it("never emits a banned generic phrase in any deterministic field", () => {
    const shapes: Partial<WorkChunk>[] = [
      { stage: "inspecting", count: 1, targets: ["index.html"] },
      { stage: "inspecting", count: 5, targets: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"] },
      { stage: "inspecting", tool: "Grep", count: 3, searches: ["TOKEN BREAKDOWN", "Priciest"], targets: ["index.html"] },
      { stage: "editing", count: 1, targets: ["caption.ts"] },
      { stage: "editing", count: 4, targets: ["a.ts", "b.ts", "c.ts", "d.ts"] },
      { stage: "editing", tool: "Write", count: 2, targets: ["new.ts", "other.ts"] },
      { stage: "testing", tool: "Bash", targets: ["the tests"] },
      { stage: "debugging", failed: true },
      { stage: "planning" },
      { stage: "summarizing" },
      { stage: "waiting" },
    ];
    for (const shape of shapes) {
      for (const mode of ["simple", "deep", "teach"] as const) {
        const c = buildCaption(chunk(shape), mode);
        for (const v of [c.title, c.simple, c.deep, c.teach]) {
          if (v) expect(hasBannedPhrase(v), `${mode}: "${v}"`).toBe(false);
        }
      }
    }
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
