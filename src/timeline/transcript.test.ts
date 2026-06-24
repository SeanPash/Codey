import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTranscript, userPrompts, cleanPromptText, readFirstPrompt, lastInterruptTs } from "./transcript.js";

// One assistant turn that calls Write, then a user turn carrying its tool_result (success),
// then an assistant turn that calls Bash, then a failing tool_result for it.
const fixture = [
  JSON.stringify({
    type: "assistant", timestamp: "2026-06-20T10:00:01.000Z",
    message: {
      usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0 },
      content: [{ type: "tool_use", id: "tu_1", name: "Write", input: { file_path: "/p/PlayerController.cs" } }],
    },
  }),
  JSON.stringify({
    type: "user", timestamp: "2026-06-20T10:00:02.000Z",
    message: { content: [{ type: "tool_result", tool_use_id: "tu_1", is_error: false, content: "ok" }] },
  }),
  JSON.stringify({
    type: "assistant", timestamp: "2026-06-20T10:00:03.000Z",
    message: {
      usage: { input_tokens: 1200, output_tokens: 80, cache_read_input_tokens: 6000, cache_creation_input_tokens: 0 },
      content: [{ type: "tool_use", id: "tu_2", name: "Bash", input: { command: "dotnet build" } }],
    },
  }),
  JSON.stringify({
    type: "user", timestamp: "2026-06-20T10:00:04.000Z",
    message: { content: [{ type: "tool_result", tool_use_id: "tu_2", is_error: true, content: "CS0103: missing Rigidbody" }] },
  }),
].join("\n");

describe("parseTranscript", () => {
  it("produces one turn per assistant message with usage and tool info", () => {
    const turns = parseTranscript(fixture);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ tool: "Write", outputTokens: 200, cacheReadTokens: 5000, isError: false });
    expect(turns[0].ts).toBe(Date.parse("2026-06-20T10:00:01.000Z"));
    expect(turns[0].toolUseId).toBe("tu_1");
  });

  it("attaches the matching tool_result error to its turn", () => {
    const turns = parseTranscript(fixture);
    expect(turns[1].tool).toBe("Bash");
    expect(turns[1].isError).toBe(true);
    expect(turns[1].errorText).toContain("CS0103");
    expect(turns[1].toolUseId).toBe("tu_2");
  });

  it("ignores blank and unparseable lines", () => {
    expect(parseTranscript("\nnot json\n" + fixture.split("\n")[0])).toHaveLength(1);
  });

  it("labels a thinking-only turn with no tool", () => {
    const t = parseTranscript(JSON.stringify({
      type: "assistant", timestamp: "2026-06-20T10:00:05.000Z",
      message: { usage: { output_tokens: 50 }, content: [{ type: "thinking", thinking: "hmm" }] },
    }));
    expect(t[0].tool).toBe("thinking");
  });

  it("captures the first text block as assistantText", () => {
    const t = parseTranscript(JSON.stringify({
      type: "assistant", timestamp: "2026-06-20T10:00:06.000Z",
      message: {
        usage: { output_tokens: 10 },
        content: [
          { type: "text", text: "Let me check the config." },
          { type: "tool_use", name: "Read", id: "t1", input: { file_path: "/a/b.ts" } },
        ],
      },
    }));
    expect(t[0].assistantText).toBe("Let me check the config.");
  });

  it("returns null for assistantText when there is no text block", () => {
    const t = parseTranscript(JSON.stringify({
      type: "assistant", timestamp: "2026-06-20T10:00:07.000Z",
      message: {
        usage: { output_tokens: 5 },
        content: [{ type: "tool_use", name: "Bash", id: "t2", input: { command: "ls" } }],
      },
    }));
    expect(t[0].assistantText).toBeNull();
  });

  it("clamps assistantText to ~200 chars and collapses whitespace", () => {
    const longText = "word ".repeat(60).trim(); // 299 chars
    const t = parseTranscript(JSON.stringify({
      type: "assistant", timestamp: "2026-06-20T10:00:08.000Z",
      message: {
        usage: { output_tokens: 20 },
        content: [{ type: "text", text: longText }],
      },
    }));
    expect(t[0].assistantText).not.toBeNull();
    expect(t[0].assistantText!.length).toBeLessThanOrEqual(200);
  });
});

describe("readFirstPrompt", () => {
  function write(lines: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), "codey-fp-"));
    const path = join(dir, "transcript.jsonl");
    writeFileSync(path, lines.join("\n"));
    return path;
  }

  it("returns the first human prompt for naming", () => {
    const path = write([
      JSON.stringify({ type: "user", message: { role: "user", content: "fix the timeline please" }, timestamp: "2026-06-21T00:00:00Z" }),
    ]);
    expect(readFirstPrompt(path)).toBe("fix the timeline please");
  });

  it("skips an opening system reminder and names off the real prompt", () => {
    const path = write([
      JSON.stringify({ type: "user", message: { role: "user", content: "<system-reminder>context blob</system-reminder>" }, timestamp: "2026-06-22T00:00:00Z" }),
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" }, timestamp: "2026-06-22T00:00:01Z" }),
    ]);
    expect(readFirstPrompt(path)).toBe("hi");
  });

  it("collapses a slash command to its name", () => {
    const path = write([
      JSON.stringify({ type: "user", message: { role: "user", content: "<command-name>code-review</command-name>" }, timestamp: "2026-06-22T00:00:00Z" }),
    ]);
    expect(readFirstPrompt(path)).toBe("/code-review");
  });

  it("names off the first real prompt after a /clear, not the control command", () => {
    const path = write([
      JSON.stringify({ type: "user", message: { role: "user", content: "<local-command-caveat>Caveat: blah</local-command-caveat>" }, timestamp: "2026-06-22T00:00:00Z" }),
      JSON.stringify({ type: "user", message: { role: "user", content: "<command-name>/clear</command-name>" }, timestamp: "2026-06-22T00:00:01Z" }),
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" }, timestamp: "2026-06-22T00:00:02Z" }),
    ]);
    expect(readFirstPrompt(path)).toBe("hi");
  });

  it("falls back to the control command when it is the only prompt", () => {
    const path = write([
      JSON.stringify({ type: "user", message: { role: "user", content: "<command-name>/clear</command-name>" }, timestamp: "2026-06-22T00:00:00Z" }),
    ]);
    expect(readFirstPrompt(path)).toBe("/clear");
  });

  it("returns null when there is no human prompt", () => {
    expect(readFirstPrompt(write([]))).toBeNull();
  });
});

describe("userPrompts", () => {
  it("returns each human prompt with its timestamp, skipping tool_results", () => {
    const text = [
      JSON.stringify({ type: "user", message: { content: "hello" }, timestamp: "2026-06-21T00:00:01Z" }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "t1", name: "Read", input: {} }] }, timestamp: "2026-06-21T00:00:02Z" }),
      JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] }, timestamp: "2026-06-21T00:00:03Z" }),
      JSON.stringify({ type: "user", message: { content: [{ type: "text", text: "goodbye" }] }, timestamp: "2026-06-21T00:00:04Z" }),
    ].join("\n");
    const p = userPrompts(text);
    expect(p.map((x) => x.text)).toEqual(["hello", "goodbye"]);
    expect(p[0].ts).toBe(Date.parse("2026-06-21T00:00:01Z"));
  });

  it("returns an empty array when there are no prompts", () => {
    expect(userPrompts("")).toEqual([]);
  });

  it("cleans noisy prompts and skips wrapper-only messages", () => {
    const text = [
      JSON.stringify({ type: "user", message: { content: "<command-name>codey:timeline</command-name>" }, timestamp: "2026-06-21T00:00:01Z" }),
      JSON.stringify({ type: "user", message: { content: "[Image #1] fix the layout please" }, timestamp: "2026-06-21T00:00:02Z" }),
      JSON.stringify({ type: "user", message: { content: "<system-reminder>be good</system-reminder>" }, timestamp: "2026-06-21T00:00:03Z" }),
    ].join("\n");
    expect(userPrompts(text).map((p) => p.text)).toEqual(["/codey:timeline", "fix the layout please"]);
  });

  it("skips the injected command body (isMeta) so only the typed command shows", () => {
    // A slash command writes two user turns: the "/name" invocation, then its expanded
    // instruction body marked isMeta. Only the first is something the user actually asked.
    const text = [
      JSON.stringify({ type: "user", message: { content: "<command-name>codey:deep</command-name>" }, timestamp: "2026-06-21T00:00:01Z" }),
      JSON.stringify({ type: "user", isMeta: true, message: { content: "Turn Codey narration on by running: node cli on --mode deep" }, timestamp: "2026-06-21T00:00:01Z" }),
      JSON.stringify({ type: "user", message: { content: "now do the real thing" }, timestamp: "2026-06-21T00:00:05Z" }),
    ].join("\n");
    expect(userPrompts(text).map((p) => p.text)).toEqual(["/codey:deep", "now do the real thing"]);
  });
});

describe("lastInterruptTs", () => {
  it("returns the timestamp of the most recent interrupt marker", () => {
    const text = [
      JSON.stringify({ type: "user", message: { content: "do the thing" }, timestamp: "2026-06-22T00:00:01Z" }),
      JSON.stringify({ type: "user", message: { content: "[Request interrupted by user]" }, timestamp: "2026-06-22T00:00:05Z" }),
      JSON.stringify({ type: "user", message: { content: [{ type: "text", text: "[Request interrupted by user for tool use]" }] }, timestamp: "2026-06-22T00:00:09Z" }),
    ].join("\n");
    expect(lastInterruptTs(text)).toBe(Date.parse("2026-06-22T00:00:09Z"));
  });

  it("returns 0 when no interrupt marker is present", () => {
    const text = JSON.stringify({ type: "user", message: { content: "hello" }, timestamp: "2026-06-22T00:00:01Z" });
    expect(lastInterruptTs(text)).toBe(0);
  });

  it("ignores blank and unparseable lines", () => {
    expect(lastInterruptTs("\nnot json\n")).toBe(0);
  });
});

describe("cleanPromptText", () => {
  it("collapses a slash command to /name", () => {
    expect(cleanPromptText("<command-name>codey:timeline</command-name>")).toBe("/codey:timeline");
  });
  it("strips image markers, keeping the words", () => {
    expect(cleanPromptText("[Image: source: C:\\x\\1.png] do the thing")).toBe("do the thing");
  });
  it("drops system reminders, command wrappers, and skill activations", () => {
    expect(cleanPromptText("<system-reminder>x</system-reminder>")).toBe("");
    expect(cleanPromptText("<command-message>codey:timeline</command-message>")).toBe("");
    expect(cleanPromptText("Base directory for this skill: C:/x/y")).toBe("");
  });
  it("drops the local-command caveat that wraps a slash command", () => {
    expect(cleanPromptText("<local-command-caveat>Caveat: do not respond</local-command-caveat>")).toBe("");
  });
  it("strips a leading terminal-prompt glyph", () => {
    expect(cleanPromptText("❯ continue working")).toBe("continue working");
  });
  it("drops a user interrupt so it never becomes a phantom prompt", () => {
    expect(cleanPromptText("[Request interrupted by user]")).toBe("");
    expect(cleanPromptText("[Request interrupted by user for tool use]")).toBe("");
  });
});
