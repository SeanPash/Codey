import { describe, it, expect } from "vitest";
import { parseBudgetArg } from "./budget.js";

describe("parseBudgetArg", () => {
  it("returns a report request for no argument", () => {
    expect(parseBudgetArg(undefined)).toEqual({ kind: "report" });
    expect(parseBudgetArg("")).toEqual({ kind: "report" });
  });

  it("returns clear for off or zero", () => {
    expect(parseBudgetArg("off")).toEqual({ kind: "clear" });
    expect(parseBudgetArg("0")).toEqual({ kind: "clear" });
  });

  it("parses a token amount, tolerating k suffix and commas", () => {
    expect(parseBudgetArg("5000")).toEqual({ kind: "arm", cap: 5000 });
    expect(parseBudgetArg("5k")).toEqual({ kind: "arm", cap: 5000 });
    expect(parseBudgetArg("12,500")).toEqual({ kind: "arm", cap: 12500 });
  });

  it("reports invalid input rather than guessing", () => {
    expect(parseBudgetArg("banana")).toEqual({ kind: "invalid" });
  });
});
