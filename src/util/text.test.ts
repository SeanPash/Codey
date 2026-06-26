import { describe, it, expect } from "vitest";
import { stripDashes, stripMarkdown } from "./text.js";

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
