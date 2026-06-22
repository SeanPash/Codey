import type { ToolEvent, Warning, TimelineChunk, SessionSnapshot } from "../types.js";
import type { AssistantTurn, UserPrompt } from "../timeline/transcript.js";
import type { RawChunk } from "../timeline/segment.js";
import { attributeChunk } from "../timeline/attribution.js";
import { sessionTotals } from "../timeline/totals.js";
import { groupThinking } from "../timeline/grouping.js";
import { groupByPrompt } from "../timeline/prompt-groups.js";
import { detectLoop, detectRepeatError } from "../warnings/detectors.js";
import { reconcileErrors } from "../warnings/reconcile.js";

const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;

// Warnings that are meaningful from history alone (hang is a live concept, so it is omitted here).
// Reconcile against the transcript first so repeat-error sees failures, which never reach the hook.
function chunkWarnings(slice: ToolEvent[], turns: AssistantTurn[]): Warning[] {
  const events = reconcileErrors(slice, turns);
  const out: Warning[] = [];
  const loop = detectLoop(events, LOOP_THRESHOLD);
  if (loop) out.push(loop);
  const repeat = detectRepeatError(events, REPEAT_ERROR_THRESHOLD);
  if (repeat) out.push(repeat);
  return out;
}

export interface SnapshotInput {
  sessionId: string;
  sessionName: string;
  project: string | null;
  color: string;
  live: boolean;
  events: ToolEvent[];
  rawChunks: RawChunk[];
  turns: AssistantTurn[];
  prompts: UserPrompt[];
  now: number;
}

interface Boundary { startIndex: number; name: string; narration: string; }

// Where tasks begin. We start from the AI/naive segmentation, then add a split at every
// prompt boundary so no task spans two prompts. That way each prompt group owns its own
// tasks instead of one session-wide task absorbing everything. A task split across prompts
// keeps the segmentation's name on each piece ("still working on X").
function chunkBoundaries(rawChunks: RawChunk[], events: ToolEvent[], prompts: UserPrompt[]): Boundary[] {
  if (events.length === 0) return [];
  const rc = [...rawChunks].sort((a, b) => a.startIndex - b.startIndex);
  const indices = new Set<number>([0]);
  for (const c of rc) if (c.startIndex > 0 && c.startIndex < events.length) indices.add(c.startIndex);
  for (const p of prompts) {
    if (p.ts <= 0) continue;
    const i = events.findIndex((e) => e.timestamp >= p.ts);
    if (i > 0) indices.add(i); // i === 0 is already a boundary; i < 0 means the prompt is after all events
  }
  return [...indices].sort((a, b) => a - b).map((i) => {
    let cover = rc[0];
    for (const c of rc) { if (c.startIndex <= i) cover = c; else break; }
    return { startIndex: i, name: cover?.name ?? "Working", narration: cover?.narration ?? "" };
  });
}

export function buildSnapshot(input: SnapshotInput): SessionSnapshot {
  const { events, rawChunks, turns } = input;

  const boundaries = chunkBoundaries(rawChunks, events, input.prompts);
  const chunks: TimelineChunk[] = boundaries.map((rc, idx) => {
    const next = boundaries[idx + 1];
    const startTs = events[rc.startIndex]?.timestamp ?? 0;
    const endIndex = next ? next.startIndex : events.length;
    const endTs = next ? (events[next.startIndex]?.timestamp ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const slice = events.slice(rc.startIndex, endIndex);
    const raw = attributeChunk(turns, startTs, endTs);
    // Fill narration only where the line has no real per-action explanation.
    const why = rc.narration || null;
    const workLines = groupThinking(raw.workLines).map((l) => ({ ...l, why: l.why ?? why }));
    const receipt = { ...raw, workLines };
    return {
      id: `c${idx}`,
      name: rc.name,
      narration: rc.narration,
      startTs,
      endTs,
      tokenTotal: receipt.workTotal + receipt.contextTotal,
      workTotal: receipt.workTotal,
      contextTotal: receipt.contextTotal,
      warnings: chunkWarnings(slice, turns),
      receipt,
    };
  });

  // Session totals come from the transcript counted once, never the sum of per-chunk totals
  // (which would re-count the shared cached context in every chunk).
  const totals = sessionTotals(turns);
  // Priciest by WORK, skipping zero-work chunks so a no-op task never headlines.
  const priciest = chunks.reduce<TimelineChunk | null>(
    (m, c) => (c.workTotal > 0 && (!m || c.workTotal > m.workTotal) ? c : m), null);

  // Span of real activity, for the total-session timer.
  const stamps = [
    ...events.map((e) => e.timestamp),
    ...turns.map((t) => t.ts),
    ...input.prompts.map((p) => p.ts),
  ].filter((t) => t > 0);
  const startedAt = stamps.length ? Math.min(...stamps) : 0;
  const activity = [...events.map((e) => e.timestamp), ...turns.map((t) => t.ts)].filter((t) => t > 0);
  const lastActivityAt = activity.length ? Math.max(...activity) : startedAt;
  const sessionEndTs = input.live ? input.now : (lastActivityAt || input.now);
  const groups = groupByPrompt(input.prompts, chunks, turns, sessionEndTs, input.live);

  return {
    sessionId: input.sessionId,
    sessionName: input.sessionName,
    project: input.project,
    color: input.color,
    live: input.live,
    startedAt,
    lastActivityAt,
    totalTokens: totals.total,
    workTotal: totals.work,
    contextTotal: totals.context,
    taskCount: chunks.length,
    priciestTaskName: priciest ? priciest.name : null,
    groups,
    chunks,
    activeWarning: null,
  };
}
