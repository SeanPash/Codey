import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withStatusLine, withoutStatusLine, stopNarrator } from "./toggle.js";

const CMD = "node /plugin/dist/cli/index.js statusline";

describe("settings status-line edit", () => {
  it("adds the statusLine entry without disturbing other keys", () => {
    const next = withStatusLine({ model: "opus" }, CMD);
    expect(next.model).toBe("opus");
    expect(next.statusLine).toEqual({ type: "command", command: CMD });
  });

  it("removes only the statusLine entry", () => {
    const next = withoutStatusLine({ model: "opus", statusLine: { type: "command", command: CMD } });
    expect(next.model).toBe("opus");
    expect(next.statusLine).toBeUndefined();
  });
});

describe("stopNarrator", () => {
  it("kills the pid recorded in the pidfile", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-pid-"));
    const path = join(dir, "narrator.pid");
    writeFileSync(path, "4242");
    const killed: number[] = [];
    stopNarrator(path, (pid) => killed.push(pid));
    expect(killed).toEqual([4242]);
  });

  it("does nothing when there is no pidfile", () => {
    const killed: number[] = [];
    stopNarrator(join(tmpdir(), "codey-missing-pid"), (pid) => killed.push(pid));
    expect(killed).toEqual([]);
  });
});
