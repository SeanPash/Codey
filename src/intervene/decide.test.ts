import { describe, it, expect } from "vitest";
import { decideIntervention, TTL_MS } from "./decide.js";
import type { InterventionFile } from "../types.js";

function file(over: Partial<InterventionFile>): InterventionFile {
  return { action: "nudge", kind: "loop", tool: "Bash", count: 6, createdAt: 1_000_000, ...over };
}

describe("decideIntervention", () => {
  it("returns null when there is no file", () => {
    expect(decideIntervention(null, "Bash", 2_000_000)).toBeNull();
  });

  it("blocks with an interpolated reason when the tool matches and is fresh", () => {
    const d = decideIntervention(file({}), "Bash", 1_000_000 + 1000);
    expect(d).toMatchObject({ block: true, consume: true });
    if (d && d.block) expect(d.reason).toContain("6 times");
  });

  it("waits (null) when a different tool fires and the file is still fresh", () => {
    expect(decideIntervention(file({}), "Read", 1_000_000 + 1000)).toBeNull();
  });

  it("expires (consume, do not block) past the TTL, even if the tool matches", () => {
    const d = decideIntervention(file({}), "Bash", 1_000_000 + TTL_MS + 1);
    expect(d).toEqual({ block: false, consume: true });
  });
});
