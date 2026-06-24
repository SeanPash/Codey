import { describe, it, expect } from "vitest";
import { humanFile, phrasePattern, purposeTitle, purposeSentence, joinNames } from "./subject.js";

describe("humanFile", () => {
  it("turns a test file into a readable noun", () => {
    expect(humanFile("math.test.js")).toBe("math tests");
    expect(humanFile("App.spec.tsx")).toBe("App tests");
  });

  it("names a README plainly", () => {
    expect(humanFile("README.md")).toBe("the README");
  });

  it("keeps an ordinary source file as its name", () => {
    expect(humanFile("math.js")).toBe("math.js");
    expect(humanFile("render.ts")).toBe("render.ts");
  });

  it("passes through a phrase that is already plain English", () => {
    expect(humanFile("the tests")).toBe("the tests");
    expect(humanFile("git status")).toBe("git status");
  });
});

describe("joinNames", () => {
  it("drops repeats so a list never says the same thing twice", () => {
    expect(joinNames(["the plugin config", "the plugin config"])).toBe("the plugin config");
    expect(joinNames(["a.ts", "a.ts", "b.ts"])).toBe("a.ts and b.ts");
  });
});

describe("phrasePattern", () => {
  it("keeps a plain identifier as the search subject", () => {
    expect(phrasePattern("validateUser")).toBe("validateUser");
  });

  it("reads an alternation as a list", () => {
    expect(phrasePattern("watch|render|web")).toBe("watch, render, and web");
  });

  it("pulls the stem out of a simple glob", () => {
    expect(phrasePattern("**/watch*")).toBe("watch");
  });

  it("falls back to the code for a noisy regex", () => {
    expect(phrasePattern("function\\s+\\w+")).toBe("the code");
    expect(phrasePattern("")).toBe("the code");
  });
});

describe("joinNames", () => {
  it("joins names the way a person speaks them", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["a"])).toBe("a");
    expect(joinNames(["a", "b"])).toBe("a and b");
    expect(joinNames(["a", "b", "c"])).toBe("a, b, and c");
    expect(joinNames(["a", "b", "c", "d"])).toBe("a, b, c, and d");
  });

  it("summarizes a long list with a count", () => {
    expect(joinNames(["a", "b", "c", "d", "e"])).toBe("a, b, c, and 2 more");
  });
});

describe("purposeTitle", () => {
  it("frames a write as adding", () => {
    expect(purposeTitle("Write", "editing", "math.js", 1)).toBe("Adding math.js");
  });

  it("frames an edit as updating", () => {
    expect(purposeTitle("Edit", "editing", "math tests", 1)).toBe("Updating math tests");
  });

  it("frames a read or search as checking", () => {
    expect(purposeTitle("Read", "inspecting", "render.ts", 1)).toBe("Checking render.ts");
    expect(purposeTitle("Grep", "inspecting", "validateUser", 1)).toBe("Checking validateUser");
  });

  it("frames a test run as verifying", () => {
    expect(purposeTitle("Bash", "testing", "the tests", 1)).toBe("Verifying the tests");
  });

  it("uses purpose words for grouped work, not a file name", () => {
    expect(purposeTitle("Write", "editing", "math.js", 4)).toBe("Creating several files");
    expect(purposeTitle("Edit", "editing", "math.js", 4)).toBe("Updating several files");
    expect(purposeTitle("Read", "inspecting", "a.ts", 4)).toBe("Checking several files");
  });

  it("has a steady title for the non-file stages", () => {
    expect(purposeTitle("Task", "planning", "", 1)).toBe("Planning the next step");
    expect(purposeTitle("Edit", "debugging", "math.js", 1)).toBe("Working through an error");
    expect(purposeTitle("Read", "summarizing", "", 1)).toBe("Wrapping up");
  });

  it("never emits an em dash", () => {
    const t = purposeTitle("Write", "editing", "math.js", 1);
    expect(t).not.toMatch(/[—–]/);
  });
});

describe("purposeSentence", () => {
  it("names the real subject in a plain sentence", () => {
    expect(purposeSentence("Read", "inspecting", "render.ts", 1)).toMatch(/render\.ts/);
    expect(purposeSentence("Grep", "inspecting", "validateUser", 1)).toMatch(/validateUser/);
    expect(purposeSentence("Bash", "testing", "the tests", 1)).toMatch(/the tests/);
  });

  it("stays readable for grouped work", () => {
    const s = purposeSentence("Write", "editing", "math.js", 4);
    expect(s.length).toBeGreaterThan(0);
    expect(s).not.toMatch(/[—–]/);
  });
});
