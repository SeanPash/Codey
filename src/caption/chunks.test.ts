import { describe, it, expect } from "vitest";
import { chunkEvents } from "./chunks.js";
import type { ToolEvent } from "../types.js";

let auto = 0;
const ev = (over: Partial<ToolEvent>): ToolEvent => ({
  id: `e${auto++}`,
  phase: "pre",
  tool: "Read",
  server: null,
  input: {},
  inputHash: "h",
  isError: false,
  errorText: null,
  timestamp: 0,
  sessionId: "s1",
  ...over,
});

const pre = (tool: string, input: unknown, ts: number, toolUseId?: string): ToolEvent =>
  ev({ phase: "pre", tool, input, timestamp: ts, toolUseId });
const post = (tool: string, ts: number, isError: boolean, toolUseId?: string): ToolEvent =>
  ev({ phase: "post", tool, timestamp: ts, isError, toolUseId });

describe("chunkEvents", () => {
  it("folds a run of file reads into one inspecting chunk", () => {
    const chunks = chunkEvents([
      pre("Read", { file_path: "a.ts" }, 0),
      pre("Read", { file_path: "b.ts" }, 100),
      pre("Grep", { pattern: "foo" }, 200),
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].stage).toBe("inspecting");
    expect(chunks[0].count).toBe(3);
    expect(chunks[0].targets).toContain("a.ts");
  });

  it("names a shell chunk by its real purpose, not a generic shell phrase", () => {
    const chunks = chunkEvents([
      pre("Bash", { command: "grep -i codey installed_plugins.json" }, 0),
      pre("Bash", { command: "cat README.md | head" }, 100),
    ]);
    expect(chunks[0].targets[0]).toMatch(/plugin/i);
    expect(chunks[0].targets.join(" ")).not.toMatch(/a few shell commands/i);
  });

  it("starts a new chunk when the stage changes", () => {
    const chunks = chunkEvents([
      pre("Read", { file_path: "a.ts" }, 0),
      pre("Edit", { file_path: "a.ts" }, 100),
      pre("Bash", { command: "npm test" }, 200),
    ]);
    expect(chunks.map((c) => c.stage)).toEqual(["inspecting", "editing", "testing"]);
    expect(chunks.map((c) => c.index)).toEqual([1, 2, 3]);
  });

  it("ignores post events for grouping but uses them for outcome", () => {
    const chunks = chunkEvents([
      pre("Bash", { command: "npm test" }, 0, "t1"),
      post("Bash", 50, true, "t1"),
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].failed).toBe(true);
    // A failed action turns the chunk into debugging, not plain testing.
    expect(chunks[0].stage).toBe("debugging");
  });

  it("marks a chunk resolved when a later action of the same tool succeeds", () => {
    const chunks = chunkEvents([
      pre("Edit", { file_path: "a.ts" }, 0, "e1"),
      post("Edit", 10, true, "e1"),
      pre("Edit", { file_path: "a.ts" }, 20, "e2"),
      post("Edit", 30, false, "e2"),
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].failed).toBe(true);
    expect(chunks[0].resolved).toBe(true);
  });

  it("splits the same stage across a long idle gap", () => {
    const chunks = chunkEvents([
      pre("Read", { file_path: "a.ts" }, 0),
      pre("Read", { file_path: "b.ts" }, 120_000),
    ]);
    expect(chunks).toHaveLength(2);
  });

  it("returns nothing for an empty event list", () => {
    expect(chunkEvents([])).toEqual([]);
  });
});
