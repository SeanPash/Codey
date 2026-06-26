import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { trimArgs, headlessExecOptions, DISALLOWED_TOOLS } from "./headless-flags.js";

describe("trimArgs", () => {
  it("loads no settings, excludes dynamic sections, sets a tiny system prompt, and disables tools", () => {
    const args = trimArgs("be brief");
    // No user/project settings: the superpowers and memory SessionStart hooks never fire.
    expect(args).toContain("--setting-sources");
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("");
    // Stable cache key across calls.
    expect(args).toContain("--exclude-dynamic-system-prompt-sections");
    // Replaces Claude Code's ~6k default system prompt with the caller's tiny one.
    expect(args[args.indexOf("--system-prompt") + 1]).toBe("be brief");
    // Drops the ~11k of tool schemas the narrator never uses, passed as one space-separated value.
    expect(args[args.indexOf("--disallowed-tools") + 1]).toBe(DISALLOWED_TOOLS.join(" "));
  });
});

describe("headlessExecOptions", () => {
  it("runs from a neutral dir, decodes utf8, and marks the call headless", () => {
    const opts = headlessExecOptions(1234);
    expect(opts.cwd).toBe(tmpdir());
    expect(opts.timeout).toBe(1234);
    expect(opts.shell).toBe(false);
    expect(opts.encoding).toBe("utf8");
    expect(opts.env?.CODEY_HEADLESS).toBe("1");
  });
});
