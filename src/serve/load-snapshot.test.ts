import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRunning } from "./load-snapshot.js";

// Mock the filesystem and collaborators so we can control what isRunning sees.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, statSync: vi.fn(() => { throw new Error("ENOENT"); }) };
});

vi.mock("../capture/prompts.js", () => ({
  readPrompts: vi.fn(() => [] as number[]),
}));

vi.mock("../statusline/state.js", () => ({
  readStatus: vi.fn(() => null),
}));

import { statSync } from "node:fs";
import { readPrompts } from "../capture/prompts.js";
import { readStatus } from "../statusline/state.js";

const mockStatSync = statSync as ReturnType<typeof vi.fn>;
const mockReadPrompts = readPrompts as ReturnType<typeof vi.fn>;
const mockReadStatus = readStatus as ReturnType<typeof vi.fn>;

// Import RUNNING_WINDOW_MS to avoid hardcoding the threshold.
import { RUNNING_WINDOW_MS } from "../cli/sessions.js";

describe("isRunning", () => {
  const DIR = "/fake/session";
  const NOW = 1_000_000;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no events file, no prompts, no status.
    mockStatSync.mockImplementation(() => { throw new Error("ENOENT"); });
    mockReadPrompts.mockReturnValue([]);
    mockReadStatus.mockReturnValue(null);
  });

  it("returns false when there is no activity and no status", () => {
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns true when events.jsonl mtime is within the running window", () => {
    mockStatSync.mockReturnValue({ mtimeMs: NOW - 1000 });
    expect(isRunning(DIR, NOW)).toBe(true);
  });

  it("returns false when events.jsonl mtime is older than the window", () => {
    mockStatSync.mockReturnValue({ mtimeMs: NOW - RUNNING_WINDOW_MS - 1 });
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns true when promptAt > doneAt even with no recent events", () => {
    // No events file, no prompts -- session looks completely idle by activity check.
    mockReadStatus.mockReturnValue({ promptAt: 500, doneAt: 400, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(true);
  });

  it("returns false when doneAt >= promptAt (Claude finished responding)", () => {
    mockReadStatus.mockReturnValue({ promptAt: 400, doneAt: 500, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns true when promptAt is set and doneAt is null (never finished)", () => {
    mockReadStatus.mockReturnValue({ promptAt: 900, doneAt: null, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(true);
  });
});
