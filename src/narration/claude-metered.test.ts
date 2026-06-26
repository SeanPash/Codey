import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { buildMeteredArgs, parseMetered, meteredExecOptions } from "./claude-metered.js";

describe("buildMeteredArgs", () => {
  it("asks claude for json output on haiku and trims the per-call context", () => {
    // The trailing flags keep narration cheap: no user/project settings means the superpowers and
    // memory SessionStart hooks never fire (they slow the call and leak into the reply), and
    // excluding the dynamic sections keeps the cached system prompt stable across calls.
    expect(buildMeteredArgs("hi")).toEqual([
      "-p", "hi",
      "--model", "haiku",
      "--output-format", "json",
      "--setting-sources", "",
      "--exclude-dynamic-system-prompt-sections",
    ]);
  });
});

describe("meteredExecOptions", () => {
  it("runs from a neutral dir so the project's CLAUDE.md never loads, and marks the call headless", () => {
    const opts = meteredExecOptions(1234);
    expect(opts.cwd).toBe(tmpdir());
    expect(opts.timeout).toBe(1234);
    expect(opts.shell).toBe(false);
    expect(opts.env?.CODEY_HEADLESS).toBe("1");
  });
});

describe("parseMetered", () => {
  it("pulls text and summed usage tokens from a json result", () => {
    const stdout = JSON.stringify({
      result: "  Claude is reading a file.  ",
      usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 0 },
    });
    expect(parseMetered(stdout, "prompt")).toEqual({ text: "Claude is reading a file.", tokens: 125 });
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
