import { describe, it, expect } from "vitest";
import { burstSummary, burstSubtitle } from "./burst.js";
import { hasBannedPhrase } from "../caption/banned.js";
import type { ReceiptLine } from "../types.js";

function line(p: Partial<ReceiptLine>): ReceiptLine {
  return { label: "", title: "", subtitle: "", tool: "Bash", tokens: 0, status: "ok",
    errorText: null, resolved: false, raw: null, why: null, failSummary: null, ts: 0,
    thoughtFirst: false, ...p };
}

// Three shell steps that all share one purpose: this is the "Inspecting session storage" run from
// the user's example, which used to collapse to "Running 3 commands" with a raw-command subtitle.
const samePurpose = [
  line({ tool: "Bash", title: "Inspecting session storage", raw: "ls ~/.codey/sessions" }),
  line({ tool: "Bash", title: "Inspecting session storage", raw: "cat events.jsonl" }),
  line({ tool: "Bash", title: "Inspecting session storage", raw: "tail -5 narration.jsonl" }),
];

const mixedPurpose = [
  line({ tool: "Bash", title: "Checking local changes", raw: "git status" }),
  line({ tool: "Bash", title: "Inspecting session storage", raw: "ls ~/.codey/sessions" }),
  line({ tool: "Bash", title: "Running the tests", raw: "npm test" }),
];

describe("burstSummary", () => {
  it("uses the shared purpose, not 'Running N commands', when one can be inferred", () => {
    expect(burstSummary(samePurpose)).toBe("Inspecting session storage");
    expect(burstSummary(samePurpose)).not.toMatch(/running \d+ commands/i);
  });

  it("falls back to an honest count only when the run has no single purpose", () => {
    expect(burstSummary(mixedPurpose)).toBe("Running 3 commands");
  });

  it("counts file reads as files, not commands", () => {
    const reads = [
      line({ tool: "Read", title: "Checking a.ts" }),
      line({ tool: "Read", title: "Checking b.ts" }),
      line({ tool: "Read", title: "Checking c.ts" }),
    ];
    expect(burstSummary(reads)).toBe("Checking 3 files");
  });
});

describe("burstSubtitle", () => {
  it("never repeats the summary line", () => {
    expect(burstSubtitle(samePurpose)).not.toBe(burstSummary(samePurpose));
    expect(burstSubtitle(mixedPurpose)).not.toBe(burstSummary(mixedPurpose));
  });

  it("never leaks a raw command into the subtitle", () => {
    for (const items of [samePurpose, mixedPurpose]) {
      const sub = burstSubtitle(items);
      expect(sub).not.toMatch(/\$\(|\| head|~\/|\.jsonl|git status|npm test|ls /);
    }
  });

  it("names the real purposes in plain English for a mixed run", () => {
    const sub = burstSubtitle(mixedPurpose);
    expect(sub).toMatch(/checking local changes/i);
    expect(sub).toMatch(/inspecting session storage/i);
    expect(hasBannedPhrase(sub)).toBe(false);
  });

  it("does not pretend a single-purpose run had multiple purposes", () => {
    expect(burstSubtitle(samePurpose)).toMatch(/across 3 steps/i);
  });
});
