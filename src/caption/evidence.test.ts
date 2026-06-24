import { describe, it, expect } from "vitest";
import { extractSymbols } from "./evidence.js";

describe("extractSymbols", () => {
  it("pulls the called function out of an added assertion, dropping the assert noise", () => {
    const syms = extractSymbols("Edit", {
      file_path: "math.test.js",
      new_string: 'console.assert(mean([2, 4, 6, 8]) === 5, "mean works");',
    });
    expect(syms).toContain("mean");
    expect(syms).not.toContain("assert");
    expect(syms).not.toContain("console");
  });

  it("names a declared function added in a write", () => {
    const syms = extractSymbols("Write", {
      file_path: "subject.ts",
      content: "export function buildEvidencePack(events) {\n  return events;\n}\n",
    });
    expect(syms).toContain("buildEvidencePack");
  });

  it("captures a test name from a new it() block", () => {
    const syms = extractSymbols("Edit", {
      file_path: "caption.test.ts",
      new_string: 'it("names the symbol it touched", () => { expect(1).toBe(1); });',
    });
    expect(syms).toContain("names the symbol it touched");
  });

  it("aggregates symbols across a MultiEdit's edits", () => {
    const syms = extractSymbols("MultiEdit", {
      file_path: "render.ts",
      edits: [
        { old_string: "a", new_string: "function clipStage(s) {}" },
        { old_string: "b", new_string: "const DONE_FOOTER = 1;" },
      ],
    });
    expect(syms).toContain("clipStage");
    expect(syms).toContain("DONE_FOOTER");
  });

  it("returns nothing for a read, which carries no changed text", () => {
    expect(extractSymbols("Read", { file_path: "index.html" })).toEqual([]);
  });

  it("caps the list so a caption stays short", () => {
    const syms = extractSymbols("Write", {
      file_path: "x.ts",
      content: "function a(){} function b(){} function c(){} function d(){} function e(){}",
    });
    expect(syms.length).toBeLessThanOrEqual(3);
  });
});
