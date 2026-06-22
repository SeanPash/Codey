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
import { RUNNING_WINDOW_MS, THINKING_WINDOW_MS } from "../cli/sessions.js";

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

  it("returns false when the turn finished, even with a just-now event", () => {
    // A tool ran a second ago, then Stop fired right after: the turn is over, so not live.
    mockStatSync.mockReturnValue({ mtimeMs: NOW - 1000 });
    mockReadStatus.mockReturnValue({ promptAt: NOW - 8000, doneAt: NOW - 500, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns true when a recent prompt is newer than doneAt, even with no recent events", () => {
    // No events file, no prompts -- session looks idle by activity, but it is mid-response.
    mockReadStatus.mockReturnValue({ promptAt: NOW - 2000, doneAt: NOW - 5000, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(true);
  });

  it("returns false when doneAt >= promptAt (Claude finished responding)", () => {
    mockReadStatus.mockReturnValue({ promptAt: NOW - 5000, doneAt: NOW - 2000, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns true when a recent prompt has no doneAt (never finished yet)", () => {
    mockReadStatus.mockReturnValue({ promptAt: NOW - 2000, doneAt: null, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(true);
  });

  it("returns false for a stale prompt past the thinking window (terminal closed mid-turn)", () => {
    mockReadStatus.mockReturnValue({ promptAt: NOW - THINKING_WINDOW_MS - 1, doneAt: null, updatedAt: NOW });
    expect(isRunning(DIR, NOW)).toBe(false);
  });

  it("returns false when the user interrupted after the last prompt (no Stop fires on cancel)", () => {
    // Mid-response by the prompt/doneAt rule, but a cancel landed after it: not live.
    mockReadStatus.mockReturnValue({ promptAt: NOW - 4000, doneAt: null, updatedAt: NOW });
    expect(isRunning(DIR, NOW, NOW - 1000)).toBe(false);
  });

  it("stays live when a newer prompt followed the interrupt", () => {
    // The user cancelled, then prompted again: the new prompt outranks the old cancel.
    mockReadStatus.mockReturnValue({ promptAt: NOW - 1000, doneAt: null, updatedAt: NOW });
    expect(isRunning(DIR, NOW, NOW - 4000)).toBe(true);
  });
});
