import type { ToolEvent } from "../types.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption } from "../caption/caption.js";

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
    const caption = buildCaption(c, "simple");
    return { startIndex: c.startIndex, name: caption.title, narration: caption.simple };
  });
  // chunkEvents starts at the first pre event; the timeline expects the first task to cover
  // everything from index 0, so anchor it there.
  if (chunks.length === 0) return [{ startIndex: 0, name: "Getting started", narration: "Claude is getting started." }];
  chunks[0] = { ...chunks[0], startIndex: 0 };
  return chunks;
}

// Build the headless segmentation prompt. One pass over the whole event list.
export function buildSegmentationPrompt(events: ToolEvent[]): string {
  const lines = events
    .map((e, i) => `${i}: ${e.phase} ${e.tool} ${JSON.stringify(e.input ?? null).slice(0, 120)}`)
    .join("\n");
  return [
    "You are grouping a coding agent's tool calls into a few named tasks for a non-technical viewer.",
    "Here are the events, numbered in order:",
    lines,
    "",
    'Return ONLY a JSON array of {"startIndex": <int>, "name": "<3-6 word task name>", "narration": "<one plain sentence>"}.',
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
