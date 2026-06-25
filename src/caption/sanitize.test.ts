import { describe, it, expect } from "vitest";
import { stripEllipsis, looksLikeEvidenceDump, clampWords, tidySubject } from "./sanitize.js";

describe("stripEllipsis", () => {
  it("turns a trailing ellipsis into a closed sentence", () => {
    expect(stripEllipsis("Claude is comparing the served page…")).toBe("Claude is comparing the served page.");
    expect(stripEllipsis("Claude is comparing the served page...")).toBe("Claude is comparing the served page.");
  });

  it("leaves a normal sentence alone", () => {
    expect(stripEllipsis("Claude is reading render.ts.")).toBe("Claude is reading render.ts.");
  });

  it("leaves an unpunctuated fragment untouched so a generated why shows verbatim", () => {
    expect(stripEllipsis("first explanation here")).toBe("first explanation here");
  });
});

describe("looksLikeEvidenceDump", () => {
  it("flags a sentence carrying raw shell syntax", () => {
    expect(looksLikeEvidenceDump("Claude is running d=$(ls -td ~/.codey/sessions/* | head -1).")).toBe(true);
    expect(looksLikeEvidenceDump("Worked on cat events.jsonl | tail -5.")).toBe(true);
  });

  it("flags a long comma list of internals", () => {
    expect(
      looksLikeEvidenceDump(
        "Claude is searching index.html, the cache copy, the serve static dir, and the runtime state.",
      ),
    ).toBe(true);
  });

  it("passes a clean one or two clause sentence", () => {
    expect(looksLikeEvidenceDump("Claude is comparing the live page with the source file to find the bug.")).toBe(false);
    expect(looksLikeEvidenceDump("Claude is reading a.ts and b.ts.")).toBe(false);
  });
});

describe("clampWords", () => {
  it("keeps a short phrase untouched", () => {
    expect(clampWords("live statusline output", 4)).toBe("live statusline output");
  });

  it("clamps a long phrase to its leading words", () => {
    expect(clampWords("cache copy index.html and serve static dir for the runtime", 4)).toBe("cache copy index.html");
  });

  it("never ends a clamp on a connective", () => {
    expect(clampWords("the served page and the source", 3)).toBe("the served page");
  });
});

describe("tidySubject", () => {
  it("collapses a shell fragment to a plain noun", () => {
    expect(tidySubject("$(ls -td ~/.codey/sessions/* | head -1)")).toBe("the command");
  });

  it("clamps a long description-derived subject", () => {
    const long = "cache copy index.html and serve static dir and runtime state and sources";
    expect(tidySubject(long).split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it("leaves a clean noun phrase alone", () => {
    expect(tidySubject("the installed plugin config")).toBe("the installed plugin config");
  });
});
