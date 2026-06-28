import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withStatusLine, withoutStatusLine, stopNarrator, pluginCacheBase, shouldRefreshStatusLine } from "./toggle.js";

const CMD = "node /plugin/dist/cli/index.js statusline";

// A real installed build path: the plugin cache keys each build by its commit SHA.
const OLD_BUILD = "C:\\Users\\me\\.claude\\plugins\\cache\\codey\\codey\\d2445f43b396\\dist\\cli\\index.js";
const NEW_BUILD = "C:\\Users\\me\\.claude\\plugins\\cache\\codey\\codey\\339976469457\\dist\\cli\\index.js";

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

describe("pluginCacheBase", () => {
  it("returns the shared prefix of every installed build", () => {
    expect(pluginCacheBase(NEW_BUILD)).toBe("C:\\Users\\me\\.claude\\plugins\\cache\\codey\\codey\\");
  });

  it("handles forward-slash paths too", () => {
    const p = "/home/me/.claude/plugins/cache/codey/codey/abc123/dist/cli/index.js";
    expect(pluginCacheBase(p)).toBe("/home/me/.claude/plugins/cache/codey/codey/");
  });

  it("returns null for a path that is not a plugin-cache build", () => {
    expect(pluginCacheBase("C:\\Users\\me\\GitHub\\Codey\\dist\\cli\\index.js")).toBeNull();
  });
});

describe("shouldRefreshStatusLine", () => {
  it("is true when the installed line points at an older build of this plugin", () => {
    expect(shouldRefreshStatusLine(`node "${OLD_BUILD}" statusline`, NEW_BUILD)).toBe(true);
  });

  it("is false when the installed line already points at the current build", () => {
    expect(shouldRefreshStatusLine(`node "${NEW_BUILD}" statusline`, NEW_BUILD)).toBe(false);
  });

  it("leaves a hand-set local dist path alone", () => {
    const local = `node "C:\\Users\\me\\GitHub\\Codey\\dist\\cli\\index.js" statusline`;
    expect(shouldRefreshStatusLine(local, NEW_BUILD)).toBe(false);
  });

  it("ignores a status line that is not ours", () => {
    expect(shouldRefreshStatusLine("node /some/other/tool.js", NEW_BUILD)).toBe(false);
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
