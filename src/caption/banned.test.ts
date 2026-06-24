import { describe, it, expect } from "vitest";
import { hasBannedPhrase, firstBannedPhrase, isVacuousExplanation } from "./banned.js";

describe("hasBannedPhrase", () => {
  it("flags the generic filler phrases Codey must never show", () => {
    const bad = [
      "Claude is reading index.html to see how it works before changing anything.",
      "Claude is checking several files to see how the pieces fit together.",
      "Claude is editing several related files in one change.",
      "Claude is updating related project files.",
      "Claude is running shell commands.",
      "Claude is working on the task.",
      "Claude is improving the implementation.",
      "Claude is making changes to a few files.",
    ];
    for (const line of bad) {
      expect(hasBannedPhrase(line)).toBe(true);
    }
  });

  it("flags the vague editing and reading fillers the caption builder used to emit", () => {
    const bad = [
      "Claude is editing render.ts, changing specific lines in place.",
      "Claude is reading render.ts to find the part it needs before editing it.",
      "Claude is reading caption.ts and render.ts to map how they connect before editing them.",
      "Claude is checking several files to get oriented.",
    ];
    for (const line of bad) {
      expect(hasBannedPhrase(line)).toBe(true);
    }
  });

  it("flags the timeline-row fillers that prompted this pass", () => {
    const bad = [
      "Reading render.ts to follow how it works.",
      "Reading prompt.ts to follow how it works.",
      "Changing banned.ts to adjust how it works.",
      "Searching the project for the code.",
      "Checking the code.",
      "Reading files to understand them.",
      "Changing files in place.",
    ];
    for (const line of bad) {
      expect(hasBannedPhrase(line)).toBe(true);
    }
  });

  it("flags the empty thinking-row fillers this pass removes", () => {
    const bad = [
      "Thinking it through",
      "Working through the approach before acting.",
      "Claude is checking git state and git state to trace how they work together.",
      "It will figure out what the right next step should be.",
    ];
    for (const line of bad) {
      expect(hasBannedPhrase(line)).toBe(true);
    }
  });

  it("passes real, grounded captions", () => {
    const good = [
      "Claude is reading index.html to find the token breakdown, saver buttons, and active terminal rendering.",
      "Claude is updating caption.ts and render.ts so they share the same work-log text.",
      "Claude is searching index.html for token breakdown, active terminal, and follow live.",
      "Claude is running the tests to confirm the caption builder still behaves.",
    ];
    for (const line of good) {
      expect(hasBannedPhrase(line)).toBe(false);
    }
  });

  it("names the offending phrase so a test failure is readable", () => {
    expect(firstBannedPhrase("Claude is checking several files.")).toMatch(/several files/i);
    expect(firstBannedPhrase("a perfectly fine sentence")).toBeNull();
  });
});

describe("isVacuousExplanation", () => {
  it("suppresses an explanation that just narrates the agent pausing or reflecting", () => {
    const vacuous = [
      "The agent paused and reflected before continuing.",
      "Claude paused to think about what to do next.",
      "It reflected on its options here.",
      "There is no specific reason given for this step.",
      "Nothing concrete to say about this one.",
    ];
    for (const t of vacuous) expect(isVacuousExplanation(t)).toBe(true);
  });

  it("keeps a real, grounded explanation", () => {
    const good = "Claude reread render.ts so the new clipStage helper would line up with the existing status bar layout.";
    expect(isVacuousExplanation(good)).toBe(false);
  });
});
