import { describe, it, expect } from "vitest";
import { renderStatus } from "./render.js";

// Strip ANSI color codes so assertions read the plain text the user sees.
const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("renderStatus", () => {
  it("shows a sentence action line and a prominent why line", () => {
    const out = plain(renderStatus({ mode: "deep", action: { tag: "editing", target: "auth.ts" }, why: "adding validation so empty logins get rejected", warning: null, updatedAt: 1 }));
    expect(out).toContain("codey");
    expect(out).toContain("Claude is editing auth.ts");
    expect(out).not.toContain("[editing]");
    expect(out).toContain("why");
    expect(out).toContain("adding validation so empty logins get rejected");
  });

  it("composes the action tag and target into a sentence", () => {
    const out = plain(renderStatus({ mode: "deep", action: { tag: "removing", target: "the file scratch-demo.txt" }, why: null, warning: null, updatedAt: 1 }));
    expect(out).toContain("Claude is removing the file scratch-demo.txt");
  });

  it("wraps a long why onto extra lines and caps the height", () => {
    const longWhy = Array(80).fill("word").join(" ");
    const out = renderStatus({ mode: "deep", action: { tag: "editing", target: "x" }, why: longWhy, warning: null, updatedAt: 1 }, 40);
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(2 + 3); // brand + now + at most 3 why lines
    expect(plain(out)).toContain("…");
  });

  it("shows a warning in place of the why when one is active", () => {
    const out = plain(renderStatus({ mode: "simple", action: { tag: "editing", target: "auth.ts" }, why: "x", warning: "stuck: same edit x3", updatedAt: 1 }));
    expect(out).toContain("stuck: same edit x3");
    expect(out).not.toContain("why");
  });

  it("renders a placeholder when nothing has happened yet", () => {
    const out = plain(renderStatus({ mode: "simple", action: null, why: null, warning: null, updatedAt: 0 }));
    expect(out).toContain("codey");
  });
});
