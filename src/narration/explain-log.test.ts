import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendPass, passesForScope } from "./explain-log.js";

function tmp() { return mkdtempSync(join(tmpdir(), "codey-explain-")); }

describe("explain log", () => {
  it("returns only the passes for the given scope, in order", () => {
    const dir = tmp();
    appendPass(dir, "300", "first");
    appendPass(dir, "300", "second");
    appendPass(dir, "300:t2", "task two");
    appendPass(dir, "999", "other turn");
    expect(passesForScope(dir, "300")).toEqual(["first", "second"]);
    expect(passesForScope(dir, "300:t2")).toEqual(["task two"]);
  });

  it("is empty for a scope with no passes", () => {
    expect(passesForScope(tmp(), "1")).toEqual([]);
  });
});
