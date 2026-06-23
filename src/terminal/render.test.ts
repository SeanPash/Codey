import { describe, it, expect } from "vitest";
import { renderNarration, renderHeader, renderCaption } from "./render.js";
import type { LiveCaption } from "../caption/caption.js";

describe("render", () => {
  it("renders a narration line as an indented why", () => {
    expect(renderNarration("Claude is testing the game.")).toBe("  why: Claude is testing the game.");
  });

  it("renders a header showing the mode", () => {
    expect(renderHeader("deep")).toContain("deep");
    expect(renderHeader("deep").toLowerCase()).toContain("codey");
  });
});

describe("renderCaption", () => {
  it("renders a stage chip and a plain-English sentence", () => {
    const cap: LiveCaption = { stage: "editing", title: "Editing auth.ts", simple: "Claude is editing auth.ts to make a change." };
    expect(renderCaption(cap)).toContain("Editing");
    expect(renderCaption(cap)).toContain("Claude is editing auth.ts");
  });
});
