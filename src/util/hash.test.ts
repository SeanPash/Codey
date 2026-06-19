import { describe, it, expect } from "vitest";
import { inputHash } from "./hash.js";

describe("inputHash", () => {
  it("is stable for the same tool + input", () => {
    expect(inputHash("Read", { path: "a" })).toBe(inputHash("Read", { path: "a" }));
  });
  it("ignores key order in the input object", () => {
    expect(inputHash("X", { a: 1, b: 2 })).toBe(inputHash("X", { b: 2, a: 1 }));
  });
  it("differs when tool or input differs", () => {
    expect(inputHash("Read", { path: "a" })).not.toBe(inputHash("Read", { path: "b" }));
    expect(inputHash("Read", { path: "a" })).not.toBe(inputHash("Write", { path: "a" }));
  });
});
