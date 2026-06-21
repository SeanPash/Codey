import { describe, it, expect } from "vitest";
import { readMs, scheduleWhy } from "./read-time.js";
import type { WhyEntry } from "../narration/history.js";

describe("readMs", () => {
  it("floors short text at 4s", () => {
    expect(readMs("a tiny note")).toBe(4000);
  });

  it("scales with word count past the floor", () => {
    const text = Array.from({ length: 20 }, () => "word").join(" "); // 20 * 350 = 7000
    expect(readMs(text)).toBe(7000);
  });

  it("caps very long text at 12s", () => {
    const text = Array.from({ length: 100 }, () => "word").join(" ");
    expect(readMs(text)).toBe(12000);
  });
});

describe("scheduleWhy", () => {
  const whys: WhyEntry[] = [
    { ts: 0, why: "first short why" },
    { ts: 100, why: "second short why" },
  ];

  it("returns null when there are no whys", () => {
    expect(scheduleWhy([], 1000)).toBeNull();
  });

  it("holds the first why until its read-time passes, even if a newer one arrived", () => {
    expect(scheduleWhy(whys, 1000)).toBe("first short why");
  });

  it("advances to the next why once the first has been read", () => {
    expect(scheduleWhy(whys, 5000)).toBe("second short why");
  });
});
