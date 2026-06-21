import { describe, it, expect } from "vitest";
import { shouldNarrate } from "./throttle.js";

describe("shouldNarrate", () => {
  // simple: still narrates so it carries a short why, but at most once / 7s
  it("simple mode narrates after a new event", () => {
    expect(shouldNarrate("simple", { newEvents: 0, msSinceLast: 99999 })).toBe(false);
    expect(shouldNarrate("simple", { newEvents: 1, msSinceLast: 99999 })).toBe(true);
  });

  it("simple mode respects the time floor", () => {
    expect(shouldNarrate("simple", { newEvents: 10, msSinceLast: 1000 })).toBe(false);
  });

  // deep: narrate every 2 new events AND not more than once / 3s
  it("deep mode narrates more often", () => {
    expect(shouldNarrate("deep", { newEvents: 2, msSinceLast: 5000 })).toBe(true);
    expect(shouldNarrate("deep", { newEvents: 1, msSinceLast: 5000 })).toBe(false);
  });

  it("deep mode waits the full read-time floor before narrating again", () => {
    expect(shouldNarrate("deep", { newEvents: 2, msSinceLast: 4000 })).toBe(false);
    expect(shouldNarrate("deep", { newEvents: 2, msSinceLast: 5000 })).toBe(true);
  });
});

describe("teach pacing", () => {
  it("narrates teach less eagerly than deep but does narrate", () => {
    expect(shouldNarrate("teach", { newEvents: 3, msSinceLast: 6000 })).toBe(true);
    expect(shouldNarrate("teach", { newEvents: 1, msSinceLast: 1000 })).toBe(false);
  });
});

describe("ask suppresses auto narration", () => {
  it("never narrates in ask mode, however many events", () => {
    expect(shouldNarrate("ask", { newEvents: 1000, msSinceLast: 1_000_000 })).toBe(false);
  });
});
