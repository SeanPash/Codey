import { describe, it, expect } from "vitest";
import { describeShellIntent } from "./shell.js";

// Phrases that mean we failed to say anything real about the command. The whole point of the
// helper is that none of these ever become the main title or sentence when better context exists.
const GENERIC = [
  /a few shell commands/i,
  /\bshell command\b/i,
  /\ba command\b/i,
  /running a command/i,
  /the \w+ command\b/i, // "the grep command", "the npm command"
  /several files/i,
];

function isGeneric(text: string): boolean {
  return GENERIC.some((re) => re.test(text));
}

// Every intent the helper returns must read as a purpose, never as a tool category.
function expectMeaningful(intent: { title: string; sentence: string; subject: string }) {
  expect(isGeneric(intent.title)).toBe(false);
  expect(isGeneric(intent.sentence)).toBe(false);
  expect(intent.sentence.startsWith("Claude is ")).toBe(true);
}

describe("describeShellIntent: command patterns are real purposes, not tool categories", () => {
  it("grep for installed_plugins reads as checking plugin config", () => {
    const intent = describeShellIntent("grep -i codey installed_plugins.json");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/plugin/i);
    expect(intent.subject).toMatch(/plugin/i);
  });

  it("cd into the Claude plugins folder reads as inspecting the plugin cache", () => {
    const intent = describeShellIntent("cd ~/.claude/plugins");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/plugin/i);
  });

  it("npm run build reads as rebuilding the plugin", () => {
    const intent = describeShellIntent("npm run build");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/build|rebuild/i);
  });

  it("npm test reads as running tests", () => {
    const intent = describeShellIntent("npm test");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/test/i);
  });

  it("a bare vitest run reads as running tests", () => {
    const intent = describeShellIntent("npx vitest run src/caption/shell.test.ts");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/test/i);
  });

  it("git status reads as checking local changes", () => {
    const intent = describeShellIntent("git status");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/change/i);
  });

  it("git diff reads as checking local changes", () => {
    const intent = describeShellIntent("git diff HEAD");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/change/i);
  });

  it("listing source folders reads as checking the source areas", () => {
    const intent = describeShellIntent("ls src/caption src/serve src/narration");
    expectMeaningful(intent);
    expect(intent.title).toMatch(/source/i);
  });
});

describe("describeShellIntent: Claude's own description wins when present", () => {
  it("uses the description rather than the bare command", () => {
    const intent = describeShellIntent(
      "node dist/cli/index.js status",
      "Show which Codey plugin copy is currently running",
    );
    expect(intent.sentence.startsWith("Claude is ")).toBe(true);
    expect(intent.sentence).toMatch(/codey plugin copy/i);
    expect(isGeneric(intent.title)).toBe(false);
  });

  it("ignores a description that is itself generic and falls back to the command", () => {
    const intent = describeShellIntent("npm test", "Run a command");
    expect(intent.title).toMatch(/test/i);
  });
});

describe("describeShellIntent: only goes generic when there is truly nothing to say", () => {
  it("an unknown bare program still avoids tool-shaped noise but stays honest", () => {
    const intent = describeShellIntent("frobnicate --hard");
    // No pattern, no description: this is the one case a plain fallback is allowed.
    expect(intent.sentence.startsWith("Claude is ")).toBe(true);
    expect(intent.subject.length).toBeGreaterThan(0);
  });
});
