import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendPass, passesForTurn } from "./explain-log.js";

function tmp() { return mkdtempSync(join(tmpdir(), "codey-explain-")); }

describe("explain log", () => {
  it("returns only the passes for the given turn, in order", () => {
    const dir = tmp();
    appendPass(dir, 300, "first");
    appendPass(dir, 300, "second");
    appendPass(dir, 999, "other turn");
    expect(passesForTurn(dir, 300)).toEqual(["first", "second"]);
  });

  it("is empty for a turn with no passes", () => {
    expect(passesForTurn(tmp(), 1)).toEqual([]);
  });
});
