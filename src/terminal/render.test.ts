import { describe, it, expect } from "vitest";
import { renderNarration, renderHeader, renderAction } from "./render.js";

describe("render", () => {
  it("renders a narration line as an indented why", () => {
    expect(renderNarration("Claude is testing the game.")).toBe("  why: Claude is testing the game.");
  });

  it("renders a header showing the mode", () => {
    expect(renderHeader("deep")).toContain("deep");
    expect(renderHeader("deep").toLowerCase()).toContain("codey");
  });
});

describe("renderAction", () => {
  it("renders a tagged action line from a label", () => {
    expect(renderAction({ tag: "editing", target: "auth.ts" })).toContain("[editing]");
    expect(renderAction({ tag: "editing", target: "auth.ts" })).toContain("auth.ts");
  });
});
