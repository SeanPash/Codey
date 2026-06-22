import { describe, it, expect } from "vitest";
import { buildIdFrom } from "./build-id.js";

describe("buildIdFrom", () => {
  it("returns the install root above dist", () => {
    expect(buildIdFrom("C:/x/cache/codey/codey/709486fc8ded/dist/cli/serve.js"))
      .toBe("C:/x/cache/codey/codey/709486fc8ded");
  });

  it("handles backslash paths", () => {
    expect(buildIdFrom("C:\\x\\codey\\abc\\dist\\cli\\index.js"))
      .toBe("C:/x/codey/abc");
  });

  it("gives different ids for different installs of the same file", () => {
    const a = buildIdFrom("/p/codey/AAA/dist/cli/serve.js");
    const b = buildIdFrom("/p/codey/BBB/dist/cli/serve.js");
    expect(a).not.toBe(b);
  });

  it("falls back to a src path in dev", () => {
    expect(buildIdFrom("/repo/Codey/src/cli/serve.ts")).toBe("/repo/Codey");
  });
});
