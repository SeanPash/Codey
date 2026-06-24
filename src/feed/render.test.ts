import { describe, it, expect } from "vitest";
import { feedChunks, advanceFeed, renderFeedHeader, type FeedCursor } from "./render.js";
import type { ToolEvent } from "../types.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
const fresh = (): FeedCursor => ({ printedChunks: new Set(), turnsHeadered: new Set() });

let auto = 0;
const pre = (tool: string, input: unknown, ts: number): ToolEvent => ({
  id: `e${auto++}`, phase: "pre", tool, server: null, input, inputHash: "h",
  isError: false, errorText: null, timestamp: ts, sessionId: "s1",
});

describe("feedChunks", () => {
  it("groups a turn's events into stage chunks and captions them", () => {
    const events = [
      pre("Read", { file_path: "a.ts" }, 10),
      pre("Read", { file_path: "b.ts" }, 20),
      pre("Edit", { file_path: "a.ts" }, 30),
    ];
    const chunks = feedChunks(events, [5], [], "simple");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].caption.stage).toBe("inspecting");
    expect(chunks[1].caption.stage).toBe("editing");
    expect(chunks[0].step).toBe(1);
    expect(chunks[1].step).toBe(2);
  });

  it("separates chunks by the prompt they belong to", () => {
    const chunks = feedChunks([pre("Read", { file_path: "a.ts" }, 10), pre("Read", { file_path: "b.ts" }, 200)], [5, 150], [], "simple");
    expect(chunks.map((c) => c.turn)).toEqual([1, 2]);
  });

  it("attaches the in-window why and grows the caption with the mode", () => {
    const chunks = feedChunks([pre("Edit", { file_path: "a.ts" }, 10)], [5], [{ ts: 12, why: "Real reason here." }], "deep");
    expect(chunks[0].caption.deep).toBe("Real reason here.");
  });
});

describe("advanceFeed", () => {
  it("prints a sealed chunk under its prompt header", () => {
    const chunks = feedChunks([
      pre("Read", { file_path: "a.ts" }, 10),
      pre("Edit", { file_path: "a.ts" }, 20),
    ], [5], [], "simple");
    const out = plain(advanceFeed(chunks, fresh()).text);
    expect(out).toContain("Prompt 1");
    expect(out).toContain("1."); // the inspecting chunk is sealed by the editing chunk
    expect(out).toContain("Checking");
  });

  it("holds the live tail chunk until a later chunk seals it", () => {
    const chunks = feedChunks([pre("Read", { file_path: "a.ts" }, 10)], [5], [], "simple");
    const out = plain(advanceFeed(chunks, fresh()).text);
    expect(out).toBe(""); // the only chunk is still the live tail, nothing sealed yet
  });

  it("flushes everything, including the tail, when sealAll is set", () => {
    const chunks = feedChunks([pre("Read", { file_path: "a.ts" }, 10)], [5], [], "simple");
    const out = plain(advanceFeed(chunks, fresh(), true).text);
    expect(out).toContain("Checking");
  });

  it("does not reprint a chunk or header across calls", () => {
    const chunks = feedChunks([
      pre("Read", { file_path: "a.ts" }, 10),
      pre("Edit", { file_path: "a.ts" }, 20),
    ], [5], [], "simple");
    const first = advanceFeed(chunks, fresh());
    const second = advanceFeed(chunks, first.cursor);
    expect(second.text).toBe("");
  });
});

it("has a header", () => {
  expect(plain(renderFeedHeader())).toContain("codey");
});
