import { describe, it, expect } from "vitest";
import { attributeChunk } from "./attribution.js";
import { groupThinking } from "./grouping.js";
import { hasBannedPhrase } from "../caption/banned.js";
import type { AssistantTurn } from "./transcript.js";

// A realistic slice of a session, including the exact shell descriptions and bare thinking turns
// that produced the generic timeline rows this pass removes. The surfaces built from it must read
// as real work, never as the old filler.
function turn(over: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 50, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, assistantText: null, ...over };
}

const SESSION: AssistantTurn[] = [
  turn({ ts: 1, tool: "thinking", assistantText: "Let me inspect the session files before touching the statusline." }),
  turn({ ts: 2, tool: "Bash", input: { command: "node dist/cli/index.js feed", description: "Check live now endpoint and statusline output" } }),
  turn({ ts: 3, tool: "Bash", input: { command: "ls ~/.codey/sessions", description: "List codey session storage" } }),
  turn({ ts: 4, tool: "Bash", input: { command: "node dist/cli/index.js status", description: "Inspect current session narration state" } }),
  turn({ ts: 5, tool: "Bash", input: { command: "git status" } }),
  turn({ ts: 6, tool: "Read", input: { file_path: "/c/Codey/src/statusline/render.ts" } }),
  turn({ ts: 7, tool: "Edit", input: { file_path: "/c/Codey/src/statusline/compose.ts" } }),
  turn({ ts: 8, tool: "Bash", input: { command: "npm test" } }),
  turn({ ts: 9, tool: "thinking", assistantText: null }), // a bare trailing thought, no decision text
];

describe("timeline caption quality over a realistic session", () => {
  const lines = groupThinking(attributeChunk(SESSION, 0, 1000).workLines);

  it("never shows a banned phrase in any title, subtitle, or label", () => {
    for (const l of lines) {
      for (const field of [l.title, l.subtitle, l.label]) {
        expect(hasBannedPhrase(field), `"${field}"`).toBe(false);
      }
    }
  });

  it("never repeats a row's title verbatim as its subtitle", () => {
    for (const l of lines) {
      const t = l.title.toLowerCase().replace(/[.\s]+$/, "");
      const s = l.subtitle.toLowerCase().replace(/[.\s]+$/, "");
      expect(s, `row "${l.title}"`).not.toBe(t);
    }
  });

  it("keeps every title a tidy purpose label, never the whole description echoed back", () => {
    for (const l of lines) {
      const words = l.title.trim().split(/\s+/).length;
      expect(words, `title "${l.title}"`).toBeLessThanOrEqual(6);
    }
  });

  it("keeps the raw command out of the subtitle, leaving it for the expandable raw row", () => {
    for (const l of lines) {
      expect(l.subtitle, `row "${l.title}"`).not.toMatch(/\bnode dist|index\.js|~\/|\| head|git status/);
    }
  });

  it("describes the feed command as verifying live narration, not 'running index.js'", () => {
    const feed = lines.find((l) => l.title.toLowerCase().includes("live") || /now endpoint/i.test(l.subtitle));
    expect(feed).toBeTruthy();
    expect(feed!.subtitle.toLowerCase()).not.toMatch(/index\.js/);
  });

  it("describes git status as checking changes, not 'git state and git state'", () => {
    const git = lines.find((l) => /change/i.test(l.title));
    expect(git).toBeTruthy();
    expect(hasBannedPhrase(git!.subtitle)).toBe(false);
  });

  it("hides the explain affordance for the bare trailing thought but not for the real decision", () => {
    const trailing = lines[lines.length - 1];
    expect(trailing.tool).toBe("thinking");
    expect(trailing.explainable).toBe(false);
    // The opening thought carried a real decision; it folds into the first action as thoughtFirst,
    // so the action that absorbed it stays explainable.
    expect(lines[0].explainable).not.toBe(false);
  });
});
