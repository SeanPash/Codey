import { describe, it, expect } from "vitest";
import { withStatusLine, withoutStatusLine } from "./toggle.js";

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
