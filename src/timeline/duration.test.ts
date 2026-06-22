import { describe, it, expect } from "vitest";
import { formatDuration } from "./duration.js";

describe("formatDuration", () => {
  it("formats sub-minute as seconds, never 0s for real work", () => {
    expect(formatDuration(0)).toBe("1s");
    expect(formatDuration(400)).toBe("1s");
    expect(formatDuration(45_000)).toBe("45s");
  });
  it("formats minutes and seconds", () => {
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(192_000)).toBe("3m 12s");
  });
  it("formats hours with zero-padded minutes", () => {
    expect(formatDuration(3_600_000)).toBe("1h 00m");
    expect(formatDuration(3_720_000)).toBe("1h 02m");
  });
});
