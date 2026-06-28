import { describe, it, expect } from "vitest";
import { inferPurpose, type PurposeEvidence } from "./purpose.js";
import { hasBannedPhrase } from "./banned.js";

const ev = (over: Partial<PurposeEvidence> = {}): PurposeEvidence => ({
  stage: "inspecting",
  tool: "Read",
  targets: [],
  searches: [],
  symbols: [],
  command: null,
  prompt: null,
  ...over,
});

describe("inferPurpose", () => {
  it("returns null when there is no recognizable domain signal", () => {
    expect(inferPurpose(ev({ targets: ["helper.ts"] }))).toBeNull();
  });

  describe("token-label / timeline page investigation", () => {
    const p = inferPurpose(
      ev({
        tool: "Bash",
        command: "diff <(curl -s localhost:4317 | grep tokenBreakdown) <(grep tokenBreakdown src/serve/public/index.html)",
        targets: ["index.html"],
        searches: ["tokenBreakdown", "token breakdown labels"],
      }),
    )!;

    it("recognizes the investigation", () => {
      expect(p).not.toBeNull();
    });

    it("simple says it is comparing the live page against the source", () => {
      expect(p.simple).toMatch(/compar/i);
      expect(p.simple).toMatch(/source file|served|live/i);
      expect(p.simple).toMatch(/label/i);
    });

    it("deep adds the cache-versus-code relationship", () => {
      expect(p.deep).toMatch(/stale|cache|browser|build/i);
      expect(p.deep).not.toBe(p.simple);
      expect(p.deep.length).toBeGreaterThan(p.simple.length);
    });

    it("teach explains the concept of a stale browser cache", () => {
      expect(p.teach).toMatch(/browser|cache|old/i);
      expect(p.teach.length).toBeGreaterThan(p.deep.length);
    });

    it("never trips a banned phrase", () => {
      for (const v of [p.title, p.simple, p.deep, p.teach]) expect(hasBannedPhrase(v)).toBe(false);
    });
  });

  describe("session storage investigation", () => {
    const p = inferPurpose(
      ev({
        tool: "Bash",
        command: "ls ~/.codey/sessions/$(ls -t ~/.codey/sessions | head -1)",
        targets: ["the session storage"],
      }),
    )!;

    it("recognizes the investigation", () => {
      expect(p).not.toBeNull();
    });

    it("simple names the local session JSONL / events store", () => {
      expect(p.simple).toMatch(/session/i);
      expect(p.simple).toMatch(/jsonl|events|stored|record/i);
    });

    it("deep ties a missing-or-present record to capture versus rendering", () => {
      expect(p.deep).toMatch(/captur|render|written|writing/i);
      expect(p.deep).not.toBe(p.simple);
    });

    it("never trips a banned phrase", () => {
      for (const v of [p.title, p.simple, p.deep, p.teach]) expect(hasBannedPhrase(v)).toBe(false);
    });
  });

  describe("live narration output verification", () => {
    const p = inferPurpose(
      ev({
        stage: "testing",
        tool: "Bash",
        command: "node dist/cli/index.js feed",
        targets: ["the feed"],
      }),
    )!;

    it("recognizes the investigation", () => {
      expect(p).not.toBeNull();
    });

    it("simple talks about the live narration output, not 'running index.js'", () => {
      expect(p.simple).toMatch(/narration|feed|caption|output/i);
      expect(p.simple).not.toMatch(/running index\.js/i);
    });

    it("deep says what running the feed confirms", () => {
      expect(p.deep).toMatch(/caption|narration|update|print/i);
      expect(p.deep).not.toBe(p.simple);
    });

    it("never trips a banned phrase", () => {
      for (const v of [p.title, p.simple, p.deep, p.teach]) expect(hasBannedPhrase(v)).toBe(false);
    });
  });

  it("does not fire the narration recognizer for an unrelated index.js run", () => {
    expect(inferPurpose(ev({ tool: "Bash", command: "node scripts/build-id.js" }))).toBeNull();
  });

  it("does not claim a comparison when the run only greps the page once", () => {
    // index.html + token breakdown, but no fetch, diff, or source side to compare against.
    expect(
      inferPurpose(ev({ tool: "Grep", targets: ["index.html"], searches: ["tokenBreakdown"] })),
    ).toBeNull();
  });
});
