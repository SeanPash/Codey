import { describe, it, expect } from "vitest";
import { sessionDisplayName } from "./session-name.js";

describe("sessionDisplayName", () => {
  it("prefers the first AI task name", () => {
    expect(sessionDisplayName({ firstChunkName: "Reinstall the plugin", firstPrompt: "delete and reinstall codey", sessionId: "abc", mtimeMs: 0 }))
      .toBe("Reinstall the plugin");
  });

  it("falls back to a trimmed first prompt (<= 48 chars, no newline)", () => {
    expect(sessionDisplayName({ firstChunkName: null, firstPrompt: "delete and reinstall the codey plugin so i can test it now please", sessionId: "abc", mtimeMs: 0 }))
      .toBe("delete and reinstall the codey plugin so i can…");
  });

  it("ignores the naive 'Working' placeholder name", () => {
    expect(sessionDisplayName({ firstChunkName: "Working", firstPrompt: "do a thing", sessionId: "abc", mtimeMs: 0 }))
      .toBe("do a thing");
  });

  it("falls back to a short id when nothing else is available", () => {
    expect(sessionDisplayName({ firstChunkName: null, firstPrompt: null, sessionId: "8535319b-3132-404f", mtimeMs: 0 }))
      .toBe("Session 8535319b");
  });
});
