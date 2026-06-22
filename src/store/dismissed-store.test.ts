import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDismissed, dismiss, restore } from "./dismissed-store.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "codey-dismiss-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("dismissed-store", () => {
  it("starts empty when no file exists", () => {
    expect(readDismissed(root).size).toBe(0);
  });

  it("remembers a dismissed id and round-trips it", () => {
    dismiss(root, "sess-a");
    expect(readDismissed(root).has("sess-a")).toBe(true);
  });

  it("restore removes an id", () => {
    dismiss(root, "sess-a");
    dismiss(root, "sess-b");
    restore(root, "sess-a");
    const ids = readDismissed(root);
    expect(ids.has("sess-a")).toBe(false);
    expect(ids.has("sess-b")).toBe(true);
  });

  it("ignores duplicate dismissals", () => {
    dismiss(root, "sess-a");
    dismiss(root, "sess-a");
    expect([...readDismissed(root)]).toEqual(["sess-a"]);
  });

  it("survives a malformed file by treating it as empty", () => {
    dismiss(root, "sess-a");
    // restoring a never-dismissed id is a no-op, not a crash
    restore(root, "never");
    expect(readDismissed(root).has("sess-a")).toBe(true);
  });
});
