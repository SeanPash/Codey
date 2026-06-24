import type { ToolEvent } from "../types.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption } from "../caption/caption.js";
import { describeShellIntent } from "../caption/shell.js";

export interface RawChunk {
  startIndex: number;
  name: string;
  narration: string;
}

// Deterministic fallback, used until the headless segmentation pass returns and any time it is
// unavailable. It reuses the shared caption model, so the timeline reads in the same plain
// English as the status line and feed: one task per work phase, named by what Claude was doing.
export function naiveSegment(events: ToolEvent[]): RawChunk[] {
  if (events.length === 0) return [];
  const chunks = chunkEvents(events).map((c) => {
    // The timeline card has room for one fuller sentence, so use the deep line: it names the
    // same real files and adds the relationship Claude is after, making the collapsed card
    // useful on its own without expanding it.
    const caption = buildCaption(c, "deep");
    return { startIndex: c.startIndex, name: caption.title, narration: caption.deep ?? caption.simple };
  });
  // chunkEvents starts at the first pre event; the timeline expects the first task to cover
  // everything from index 0, so anchor it there.
  if (chunks.length === 0) return [{ startIndex: 0, name: "Getting started", narration: "Claude is getting started." }];
  chunks[0] = { ...chunks[0], startIndex: 0 };
  return chunks;
}

function field(input: unknown, key: string): string | null {
  if (input && typeof input === "object") {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}

// A short readable summary of one event, so the model groups by what Claude was accomplishing
// rather than by raw tool JSON. Shell events carry Claude's own description and their command
// intent; file events name the file; searches name what they looked for.
function eventSummary(e: ToolEvent): string {
  if (e.tool === "Bash" || e.tool === "PowerShell") {
    const command = field(e.input, "command");
    const desc = field(e.input, "description");
    if (command) {
      const intent = describeShellIntent(command, desc);
      const note = desc && desc !== intent.title ? ` (${desc})` : "";
      return `${intent.title}${note}`;
    }
    return desc ?? "ran a command";
  }
  const file = field(e.input, "file_path") ?? field(e.input, "path") ?? field(e.input, "notebook_path");
  if (file) return `${e.tool} ${basename(file)}`;
  const pattern = field(e.input, "pattern");
  if (pattern) return `${e.tool} for ${pattern}`;
  return e.tool;
}

// Build the headless segmentation prompt. One pass over the whole event list.
export function buildSegmentationPrompt(events: ToolEvent[]): string {
  const lines = events
    .map((e, i) => `${i}: ${e.phase} ${eventSummary(e)}`)
    .join("\n");
  return [
    "You are grouping a coding agent's tool calls into a few named tasks for a non-technical viewer.",
    "Each event below is already summarized by what it was trying to accomplish.",
    "Here are the events, numbered in order:",
    lines,
    "",
    'Return ONLY a JSON array of {"startIndex": <int>, "name": "<3-6 word task name>", "narration": "<one plain sentence>"}.',
    "Name each task by its PURPOSE (what Claude was trying to do), never by the tool or command it used.",
    'Good: "Verifying the install". Bad: "Running shell commands" or "Bash calls".',
    "Ground the names in the real files, commands, and intent shown above. Do not use em dashes.",
    "The first chunk must start at index 0. Chunks must be in ascending startIndex order.",
    "Aim for 2-6 tasks total. No prose outside the JSON.",
  ].join("\n");
}

function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

// Parse the model's reply into clean, in-bounds, ordered chunks. Returns [] on anything unusable.
export function parseSegmentation(text: string, eventCount: number): RawChunk[] {
  if (eventCount === 0) return [];
  const json = extractJsonArray(text);
  if (!json) return [];
  let arr: unknown;
  try { arr = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(arr)) return [];

  const chunks = arr
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof (c as any).startIndex === "number")
    .map((c) => ({
      startIndex: Math.max(0, Math.min(eventCount - 1, Math.floor(c.startIndex as number))),
      name: String((c as any).name ?? "Task").slice(0, 60),
      narration: String((c as any).narration ?? ""),
    }))
    .sort((a, b) => a.startIndex - b.startIndex);

  if (chunks.length === 0) return [];
  chunks[0].startIndex = 0;
  // Drop duplicate boundaries so each chunk is non-empty.
  const seen = new Set<number>();
  return chunks.filter((c) => (seen.has(c.startIndex) ? false : (seen.add(c.startIndex), true)));
}
