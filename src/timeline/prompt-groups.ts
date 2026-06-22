import type { TimelineChunk, PromptGroup } from "../types.js";
import type { AssistantTurn } from "./transcript.js";
import type { UserPrompt } from "./transcript.js";

// Keep a prompt heading readable; the full text is the user's own message.
function clampPrompt(s: string, n = 80): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > n ? oneLine.slice(0, n - 1).trimEnd() + "…" : oneLine;
}

interface Boundary { id: string; label: string; startTs: number; }

// Sum the token cost of the turns inside a window. Output -> work, input+cache -> context.
// Done over turns (not chunks) so a text-only prompt that ran no tools still shows its cost.
function windowTotals(turns: AssistantTurn[], startTs: number, endTs: number) {
  let work = 0, context = 0;
  for (const t of turns) {
    if (t.ts < startTs || t.ts >= endTs) continue;
    work += t.outputTokens;
    context += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
  }
  return { work, context };
}

// Split a session into one group per user prompt: each holds the tasks it set off, its
// token cost, and how long it ran. Groups are returned in time order.
//
// - A chunk joins the group whose [startTs, endTs) window contains its startTs.
// - Work/context come from the turns in the window, so totals reconcile to the session.
// - Anything before the first prompt becomes a leading "Earlier in this session" group.
// - With no prompts at all, the whole session is one group.
// - The last group is the live/active one when `live`; its duration stays null so the
//   browser can tick it, and it always appears even before any task lands.
export function groupByPrompt(
  prompts: UserPrompt[],
  chunks: TimelineChunk[],
  turns: AssistantTurn[],
  sessionEndTs: number,
  live: boolean,
): PromptGroup[] {
  const boundaries: Boundary[] = [];

  const sorted = [...prompts].filter((p) => p.ts > 0).sort((a, b) => a.ts - b.ts);
  const firstActivity = Math.min(
    chunks.length ? chunks[0].startTs : Number.MAX_SAFE_INTEGER,
    turns.length ? turns[0].ts : Number.MAX_SAFE_INTEGER,
  );

  // A leading group for work that happened before the first recorded prompt (e.g. a resumed
  // session), only when there is something to put in it.
  if (sorted.length === 0 || (firstActivity !== Number.MAX_SAFE_INTEGER && firstActivity < sorted[0].ts)) {
    boundaries.push({
      id: "p0",
      label: sorted.length === 0 ? "This session" : "Earlier in this session",
      startTs: firstActivity === Number.MAX_SAFE_INTEGER ? (sorted[0]?.ts ?? 0) : firstActivity,
    });
  }
  sorted.forEach((p, i) => {
    boundaries.push({
      id: `p${boundaries.length}`,
      label: clampPrompt(p.text) || `Prompt ${i + 1}`,
      startTs: p.ts,
    });
  });

  if (boundaries.length === 0) return [];

  return boundaries.map((b, i) => {
    const next = boundaries[i + 1];
    const endTs = next ? next.startTs : sessionEndTs;
    const isLast = i === boundaries.length - 1;
    const groupChunks = chunks.filter((c) => c.startTs >= b.startTs && (next ? c.startTs < next.startTs : true));
    const { work, context } = windowTotals(turns, b.startTs, next ? next.startTs : Number.MAX_SAFE_INTEGER);
    const liveGroup = live && isLast;
    return {
      id: b.id,
      prompt: b.label,
      startTs: b.startTs,
      endTs,
      durationMs: liveGroup ? null : Math.max(0, endTs - b.startTs),
      workTotal: work,
      contextTotal: context,
      tokenTotal: work,
      taskCount: groupChunks.length,
      chunks: groupChunks,
      live: liveGroup,
    };
  });
}
