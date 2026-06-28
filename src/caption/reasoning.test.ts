import { describe, it, expect } from "vitest";
import { cleanReasoning } from "./reasoning.js";

describe("cleanReasoning", () => {
  it("returns null for empty or missing text", () => {
    expect(cleanReasoning(null, {})).toBeNull();
    expect(cleanReasoning("", {})).toBeNull();
    expect(cleanReasoning("   ", {})).toBeNull();
  });

  it("keeps a specific progress sentence as the subtitle", () => {
    const out = cleanReasoning("Now I'll update buildCaption so the statusline reads the new domain purpose.", {});
    expect(out).toBe("Now I'll update buildCaption so the statusline reads the new domain purpose.");
  });

  it("keeps up to two sentences when both are concrete", () => {
    const out = cleanReasoning(
      "I'm comparing the served page with index.html. The labels exist in source, so the browser tab is stale.",
      {},
    );
    expect(out).toMatch(/served page/);
    expect(out).toMatch(/stale/);
  });

  it("clamps a long ramble to a couple of sentences at a sentence boundary", () => {
    const long =
      "First I will read the file. Then I will edit the function. Then I will run the tests. Then I will rebuild. Then I will reinstall the plugin.";
    const out = cleanReasoning(long, {})!;
    const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("rejects banned generic filler", () => {
    expect(cleanReasoning("Just thinking it through before acting.", {})).toBeNull();
    expect(cleanReasoning("Working through the approach before acting.", {})).toBeNull();
  });

  it("rejects vacuous reflection", () => {
    expect(cleanReasoning("The agent paused and reflected on what to do.", {})).toBeNull();
    expect(cleanReasoning("No concrete reason here, just looking around.", {})).toBeNull();
  });

  it("never ends with an ellipsis and never contains an em dash", () => {
    const out = cleanReasoning("Reading render.ts to see the HUD layout — it assembles two lines…", {})!;
    expect(out).not.toMatch(/(\.{3,}|…)$/);
    expect(out).not.toMatch(/[—–]/);
  });

  it("ensures the sentence ends with terminal punctuation", () => {
    const out = cleanReasoning("Editing caption.ts to add the purpose lookup", {})!;
    expect(out).toMatch(/[.!?]$/);
  });

  it("strips markdown emphasis and backticks", () => {
    const out = cleanReasoning("Updating `caption.ts` so the **statusline** uses the purpose.", {})!;
    expect(out).not.toMatch(/[`*]/);
  });

  it("rejects a sentence too short to carry meaning", () => {
    expect(cleanReasoning("Done.", {})).toBeNull();
    expect(cleanReasoning("Ok.", {})).toBeNull();
  });
});
