import { describe, it, expect } from "vitest";
import { shouldNarrate } from "./throttle.js";

describe("shouldNarrate", () => {
  // simple: narrate at most every 5 new events AND not more than once / 8s
  it("simple mode waits for 5 new events", () => {
    expect(shouldNarrate("simple", { newEvents: 4, msSinceLast: 99999 })).toBe(false);
    expect(shouldNarrate("simple", { newEvents: 5, msSinceLast: 99999 })).toBe(true);
  });

  it("simple mode respects the time floor", () => {
    expect(shouldNarrate("simple", { newEvents: 10, msSinceLast: 1000 })).toBe(false);
  });

  // deep: narrate every 2 new events AND not more than once / 3s
  it("deep mode narrates more often", () => {
    expect(shouldNarrate("deep", { newEvents: 2, msSinceLast: 5000 })).toBe(true);
    expect(shouldNarrate("deep", { newEvents: 1, msSinceLast: 5000 })).toBe(false);
  });
});

describe("teach pacing", () => {
  it("narrates teach less eagerly than deep but does narrate", () => {
    expect(shouldNarrate("teach", { newEvents: 3, msSinceLast: 6000 })).toBe(true);
    expect(shouldNarrate("teach", { newEvents: 1, msSinceLast: 1000 })).toBe(false);
  });
});
