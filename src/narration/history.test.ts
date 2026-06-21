import { describe, it, expect } from "vitest";
import { mkdtempSync, appendFileSync } from "node:fs";
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

  it("skips a malformed line instead of throwing", () => {
    const dir = mkdtempSync(join(tmpdir(), "codey-why-"));
    appendWhy(dir, { ts: 1, why: "ok" });
    appendFileSync(join(dir, "narration.jsonl"), "{ broken line\n");
    appendWhy(dir, { ts: 2, why: "also ok" });
    expect(readWhys(dir)).toEqual([
      { ts: 1, why: "ok" },
      { ts: 2, why: "also ok" },
    ]);
  });
});
