import { describe, it, expect } from "vitest";
import { renderNarration, renderHeader } from "./render.js";

describe("render", () => {
  it("renders a narration line with a speech glyph", () => {
    expect(renderNarration("Claude is testing the game.")).toBe("💬  Claude is testing the game.");
  });

  it("renders a header showing the mode", () => {
    expect(renderHeader("deep")).toContain("deep");
    expect(renderHeader("deep").toLowerCase()).toContain("codey");
  });
});
