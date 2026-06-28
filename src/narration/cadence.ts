import type { ToolEvent, Mode } from "../types.js";
import { chunkEvents } from "../caption/chunks.js";

// A tool that runs longer than this, then finishes, is worth a fresh sentence: it usually means
// a real result just landed (a build, a long search, a test run).
export const LONG_TOOL_MS = 8000;

// Per-mode pacing. floor is a hard "never narrate more often than this"; cap is the longest a
// quiet stretch of work can go before we narrate anyway. Between the two, a salient signal fires
// a call. Tuned so deep lands roughly one to two paid calls on a typical turn.
export const CADENCE: Record<Mode, { floorMs: number; capMs: number }> = {
  simple: { floorMs: 45_000, capMs: 75_000 },
  deep: { floorMs: 25_000, capMs: 45_000 },
  teach: { floorMs: 30_000, capMs: 50_000 },
};

export type Family = "edit" | "read" | "search" | "run" | "task" | "other";

// Group tools by the kind of work they do, so a switch between kinds (read -> run, edit -> search)
// reads as a new beat even when the naive stage segmentation keeps them together.
export function toolFamily(tool: string): Family {
  if (tool === "Edit" || tool === "MultiEdit" || tool === "Write" || tool === "NotebookEdit") return "edit";
  if (tool === "Read") return "read";
  if (tool === "Grep" || tool === "Glob") return "search";
  if (tool === "Bash" || tool === "PowerShell") return "run";
  if (tool === "Task" || tool === "Agent") return "task";
  return "other";
}

// The index of the last "pre" event strictly before a cutoff, or -1 when there is none.
function lastPreBefore(events: ToolEvent[], cutoff: number): ToolEvent | null {
  for (let i = Math.min(cutoff, events.length) - 1; i >= 0; i--) {
    if (events[i].phase === "pre") return events[i];
  }
  return null;
}

function lastPre(events: ToolEvent[]): ToolEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].phase === "pre") return events[i];
  }
  return null;
}

// A new naive segment began at or after the narrated point: a real task boundary the segmenter
// already draws, reused here for free. The first chunk (startIndex 0) is the opening task, not a
// boundary, so it never counts on its own.
export function naiveBoundaryCrossed(events: ToolEvent[], lastNarratedIndex: number): boolean {
  return chunkEvents(events).some((c) => c.startIndex > 0 && c.startIndex >= lastNarratedIndex);
}

// The active tool family differs from the family in flight at the last narration: Claude moved
// from, say, reading to running, which is worth saying even within one stage.
export function toolFamilyChanged(events: ToolEvent[], lastNarratedIndex: number): boolean {
  const now = lastPre(events);
  const then = lastPreBefore(events, lastNarratedIndex);
  if (!now || !then) return false;
  return toolFamily(now.tool) !== toolFamily(then.tool);
}

// A tool that ran longer than the threshold just completed inside the unnarrated window. Pairs each
// post with its matching pre (by tool_use id, else the oldest open call of the same tool).
export function longToolFinished(events: ToolEvent[], lastNarratedIndex: number, thresholdMs = LONG_TOOL_MS): boolean {
  const openById = new Map<string, ToolEvent>();
  const openByTool = new Map<string, ToolEvent[]>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.phase === "pre") {
      if (e.toolUseId) openById.set(e.toolUseId, e);
      const q = openByTool.get(e.tool) ?? [];
      q.push(e);
      openByTool.set(e.tool, q);
      continue;
    }
    // post: find its pre
    let openPre: ToolEvent | undefined;
    if (e.toolUseId && openById.has(e.toolUseId)) {
      openPre = openById.get(e.toolUseId);
      openById.delete(e.toolUseId);
      const q = openByTool.get(e.tool);
      if (q) { const at = q.indexOf(openPre!); if (at >= 0) q.splice(at, 1); }
    } else {
      openPre = openByTool.get(e.tool)?.shift();
    }
    if (!openPre) continue;
    if (i >= lastNarratedIndex && e.timestamp - openPre.timestamp > thresholdMs) return true;
  }
  return false;
}

export type TriggerReason = "warning" | "long-tool" | "task" | "family" | "cap";

export interface CadenceInput {
  events: ToolEvent[];
  lastNarratedIndex: number; // events.length at the last narration (0 = never narrated)
  lastCallAt: number;        // ms epoch of the last narration (0 = never)
  now: number;
  warningActive: boolean;    // a free detector is currently tripped
}

// Decide whether to fire a paid narration this tick, and why. Pure: all inputs are passed in, so
// the engine owns the state and tests never spawn a process. Salience precedence puts the most
// useful thing to say first (a warning), then a finished long tool, then structural beats.
export function shouldNarrate(mode: Mode, input: CadenceInput): { fire: boolean; reason: TriggerReason | null } {
  const { events, lastNarratedIndex, lastCallAt, now, warningActive } = input;
  const { floorMs, capMs } = CADENCE[mode];

  if (events.length <= lastNarratedIndex) return { fire: false, reason: null };

  const sinceCall = lastCallAt === 0 ? Infinity : now - lastCallAt;
  if (sinceCall < floorMs) return { fire: false, reason: null };

  if (warningActive) return { fire: true, reason: "warning" };
  if (longToolFinished(events, lastNarratedIndex)) return { fire: true, reason: "long-tool" };
  if (naiveBoundaryCrossed(events, lastNarratedIndex)) return { fire: true, reason: "task" };
  if (toolFamilyChanged(events, lastNarratedIndex)) return { fire: true, reason: "family" };
  if (sinceCall >= capMs) return { fire: true, reason: "cap" };

  return { fire: false, reason: null };
}
