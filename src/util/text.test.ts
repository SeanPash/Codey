import { describe, it, expect } from "vitest";
import { stripDashes, stripMarkdown, stripEmphasis } from "./text.js";

describe("stripDashes", () => {
  it("turns an em dash into a comma", () => {
    expect(stripDashes("counts lines — a quick check")).toBe("counts lines, a quick check");
    expect(stripDashes("counts lines—a quick check")).toBe("counts lines, a quick check");
  });

  it("turns an en dash into a comma", () => {
    expect(stripDashes("counts lines – a quick check")).toBe("counts lines, a quick check");
  });

  it("turns a spaced hyphen clause break into a comma", () => {
    expect(stripDashes("a standard utility - it counts lines")).toBe("a standard utility, it counts lines");
  });

  it("leaves real hyphens and numbers alone", () => {
    expect(stripDashes("a well-formed file with 5,000 lines")).toBe("a well-formed file with 5,000 lines");
  });

  it("does not leave a doubled comma or a space before a comma", () => {
    expect(stripDashes("one approach, — you might read it all")).toBe("one approach, you might read it all");
  });

  it("contains no em or en dash after cleaning", () => {
    const out = stripDashes("first — second – third - fourth");
    expect(out).not.toMatch(/[—–]/);
    expect(out).toBe("first, second, third, fourth");
  });

  it("keeps section breaks so a multi-part recap stays organized", () => {
    const out = stripDashes("What changed: removed the line.\n\nFiles touched: index.html");
    expect(out).toBe("What changed: removed the line.\n\nFiles touched: index.html");
  });

  it("collapses runs of spaces and tabs on a line but never the newlines", () => {
    expect(stripDashes("a    b\nc\t\td")).toBe("a b\nc d");
  });
});

describe("stripMarkdown", () => {
  it("removes inline code fences but keeps the name", () => {
    expect(stripMarkdown("the `loss()` function in `helper.ts`")).toBe("the loss() function in helper.ts");
  });

  it("unwraps bold and italics", () => {
    expect(stripMarkdown("this is **important** and *useful*")).toBe("this is important and useful");
  });

  it("leaves plain prose untouched", () => {
    expect(stripMarkdown("Claude is editing helper.ts so the loss function runs.")).toBe(
      "Claude is editing helper.ts so the loss function runs.",
    );
  });
});

describe("stripEmphasis", () => {
  it("removes bold markers around a section label but keeps the newlines", () => {
    const out = stripEmphasis("**Why this mattered:** the tests must pass.\n**How Claude did it:** it ran them.");
    expect(out).toBe("Why this mattered: the tests must pass.\nHow Claude did it: it ran them.");
  });

  it("drops inline code fences and leading heading hashes", () => {
    expect(stripEmphasis("## Concept: the `node --test` runner finds tests.")).toBe(
      "Concept: the node --test runner finds tests.",
    );
  });

  it("tidies the extra space a removed marker leaves without touching real content", () => {
    expect(stripEmphasis("Concept: __caching__ stores a result.")).toBe("Concept: caching stores a result.");
  });

  it("leaves clean, unformatted prose alone", () => {
    const clean = "Why this mattered: the change keeps the count honest.\nHow Claude did it: it read the store.";
    expect(stripEmphasis(clean)).toBe(clean);
  });
});
