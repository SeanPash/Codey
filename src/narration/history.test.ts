import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendWhy, readWhys } from "./history.js";

describe("narration history", () => {
  it("round-trips appended whys in order", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-why-"));
    appendWhy(dir, { ts: 1, why: "first" });
    appendWhy(dir, { ts: 2, why: "second" });
    expect(readWhys(dir)).toEqual([
      { ts: 1, why: "first" },
      { ts: 2, why: "second" },
    ]);
  });

  it("returns an empty list when nothing was written", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-why-"));
    expect(readWhys(dir)).toEqual([]);
  });
});
