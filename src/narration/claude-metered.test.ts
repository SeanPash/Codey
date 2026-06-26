import { describe, it, expect } from "vitest";
import { buildMeteredArgs, parseMetered } from "./claude-metered.js";
import { trimArgs, NARRATOR_SYSTEM_PROMPT } from "./headless-flags.js";

describe("buildMeteredArgs", () => {
  it("asks claude for json output on haiku and applies the narrator context trim", () => {
    expect(buildMeteredArgs("hi")).toEqual([
      "-p", "hi",
      "--model", "haiku",
      "--output-format", "json",
      ...trimArgs(NARRATOR_SYSTEM_PROMPT),
    ]);
  });
});

describe("parseMetered", () => {
  it("pulls text, summed tokens, the usage breakdown, and the CLI's own cost", () => {
    const stdout = JSON.stringify({
      result: "  Claude is reading a file.  ",
      total_cost_usd: 0.0094,
      usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 0 },
    });
    expect(parseMetered(stdout, "prompt")).toEqual({
      text: "Claude is reading a file.",
      tokens: 125,
      usage: { input: 100, output: 20, cacheRead: 5, cacheWrite: 0 },
      costUsd: 0.0094, // the CLI's authoritative number, not a rate estimate
    });
  });

  it("falls back to the rate estimate when the CLI reports no cost", () => {
    const stdout = JSON.stringify({
      result: "hi",
      usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 0 },
    });
    // 1M cache-read tokens at $0.10/M = $0.10
    expect(parseMetered(stdout, "p")?.costUsd).toBeCloseTo(0.1, 6);
  });

  it("estimates tokens from length when usage is absent", () => {
    const stdout = JSON.stringify({ result: "abcd" });
    const r = parseMetered(stdout, "abcd");
    expect(r?.text).toBe("abcd");
    expect(r?.tokens).toBe(2); // ceil((4 + 4) / 4)
  });

  it("treats non-json stdout as the text and estimates tokens", () => {
    const r = parseMetered("plain text reply", "p");
    expect(r?.text).toBe("plain text reply");
    expect(r?.tokens).toBeGreaterThan(0);
  });

  it("returns null on empty stdout", () => {
    expect(parseMetered("   ", "p")).toBeNull();
  });
});
