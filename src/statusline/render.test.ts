import { describe, it, expect } from "vitest";
import { renderStatus } from "./render.js";

describe("renderStatus", () => {
  it("shows a tagged action line and an indented why line", () => {
    const out = renderStatus({ mode: "deep", action: { tag: "editing", target: "auth.ts" }, why: "adding validation so empty logins get rejected", warning: null, updatedAt: 1 });
    expect(out).toContain("codey");
    expect(out).toContain("[editing]");
    expect(out).toContain("auth.ts");
    expect(out).toContain("why: adding validation so empty logins get rejected");
  });

  it("shows a warning in place of the why when one is active", () => {
    const out = renderStatus({ mode: "simple", action: { tag: "editing", target: "auth.ts" }, why: "x", warning: "stuck: same edit x3", updatedAt: 1 });
    expect(out).toContain("stuck: same edit x3");
    expect(out).not.toContain("why: x");
  });

  it("renders a placeholder when nothing has happened yet", () => {
    const out = renderStatus({ mode: "simple", action: null, why: null, warning: null, updatedAt: 0 });
    expect(out).toContain("codey");
  });
});
