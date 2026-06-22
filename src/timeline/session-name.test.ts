import { describe, it, expect } from "vitest";
import { sessionDisplayName, projectFrom, sessionColor } from "./session-name.js";

describe("sessionDisplayName", () => {
  it("prefers the first AI task name", () => {
    expect(sessionDisplayName({ firstChunkName: "Reinstall the plugin", firstPrompt: "delete and reinstall codey", sessionId: "abc", mtimeMs: 0 }))
      .toBe("Reinstall the plugin");
  });

  it("falls back to a short first prompt trimmed on a word boundary", () => {
    const out = sessionDisplayName({ firstChunkName: null, firstPrompt: "delete and reinstall the codey plugin so i can test it now please", sessionId: "abc", mtimeMs: 0 });
    expect(out).toBe("delete and reinstall the codey…");
    expect(out.length).toBeLessThanOrEqual(38);
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

describe("projectFrom", () => {
  it("returns the folder name from a cwd", () => {
    expect(projectFrom("C:/Users/me/Documents/GitHub/Codey")).toBe("Codey");
    expect(projectFrom("/home/me/projects/app/")).toBe("app");
  });
  it("returns null when cwd is missing", () => {
    expect(projectFrom(null)).toBeNull();
  });
});

describe("sessionColor", () => {
  it("is stable for the same id and a valid hsl string", () => {
    expect(sessionColor("abc")).toBe(sessionColor("abc"));
    expect(sessionColor("abc")).toMatch(/^hsl\(\d+ 70% 62%\)$/);
  });
});
