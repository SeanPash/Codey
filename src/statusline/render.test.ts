import { describe, it, expect } from "vitest";
import { renderStatus } from "./render.js";
import type { StatusView } from "./view.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

const base: StatusView = {
  mode: "deep",
  current: { seq: 15, tag: "removing", target: "the file temp-demo.txt", raw: "C:\\proj\\temp-demo.txt" },
  prev: [],
  why: null,
  warning: null,
};

describe("renderStatus", () => {
  it("shows a loud uppercase mode in the header", () => {
    const out = plain(renderStatus(base));
    expect(out).toContain("CODEY");
    expect(out).toContain("DEEP");
  });

  it("numbers and phrases the current task, with the raw target above it", () => {
    const out = plain(renderStatus(base));
    const rawIdx = out.indexOf("C:\\proj\\temp-demo.txt");
    const taskIdx = out.indexOf("#15 Claude is removing the file temp-demo.txt");
    expect(rawIdx).toBeGreaterThan(-1);
    expect(taskIdx).toBeGreaterThan(-1);
    expect(rawIdx).toBeLessThan(taskIdx); // raw sits above task
  });

  it("marks prev rows as done with their number, separated by a divider", () => {
    const out = plain(renderStatus({
      ...base,
      prev: [
        { seq: 13, tag: "reading", target: "the file rules.md", raw: "rules.md" },
        { seq: 14, tag: "writing", target: "the file temp-demo.txt", raw: "temp-demo.txt" },
      ],
    }));
    expect(out).toContain("prev");
    expect(out).toContain("#13 reading the file rules.md");
    expect(out).toContain("#14 writing the file temp-demo.txt");
    expect(out).toContain("✓");
    expect(out).toContain("├"); // a divider rule between sections
  });

  it("shows the why in its own section when present", () => {
    const out = plain(renderStatus({ ...base, why: "cleaning up the demo file" }));
    expect(out).toContain("why");
    expect(out).toContain("cleaning up the demo file");
  });

  it("shows a warning in place of the why", () => {
    const out = plain(renderStatus({ ...base, why: "x", warning: "stuck: same edit x3" }));
    expect(out).toContain("stuck: same edit x3");
    expect(out).not.toContain("why");
  });

  it("renders a waiting placeholder when there is no current card", () => {
    const out = plain(renderStatus({ mode: "simple", current: null, prev: [], why: null, warning: null }));
    expect(out).toContain("CODEY");
    expect(out).toContain("waiting for Claude");
  });

  it("frames the card and closes the corner", () => {
    const out = plain(renderStatus(base));
    expect(out.startsWith("╭")).toBe(true);
    expect(out.trimEnd().endsWith("╰")).toBe(true);
  });

  it("colors the frame differently per mode", () => {
    const simple = renderStatus({ ...base, mode: "simple" });
    const deep = renderStatus({ ...base, mode: "deep" });
    expect(simple).not.toEqual(deep);
  });
});
