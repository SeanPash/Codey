import { describe, it, expect } from "vitest";
import { parseTranscript, firstUserPrompt } from "./transcript.js";

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
});

describe("firstUserPrompt", () => {
  it("returns the first human user message text", () => {
    const text = [
      JSON.stringify({ type: "user", message: { role: "user", content: "fix the timeline please" }, timestamp: "2026-06-21T00:00:00Z" }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [] } }),
    ].join("\n");
    expect(firstUserPrompt(text)).toBe("fix the timeline please");
  });

  it("reads text from a content-array user message", () => {
    const text = JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text: "hello there" }] } });
    expect(firstUserPrompt(text)).toBe("hello there");
  });

  it("returns null when there is no user message", () => {
    expect(firstUserPrompt("")).toBeNull();
  });
});
