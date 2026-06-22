import type { ToolEvent, Warning, TimelineChunk, SessionSnapshot } from "../types.js";
import type { AssistantTurn } from "../timeline/transcript.js";
import type { RawChunk } from "../timeline/segment.js";
import { attributeChunk } from "../timeline/attribution.js";
import { sessionTotals } from "../timeline/totals.js";
import { groupThinking } from "../timeline/grouping.js";
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
}

export function buildSnapshot(input: SnapshotInput): SessionSnapshot {
  const { events, rawChunks, turns } = input;

  const chunks: TimelineChunk[] = rawChunks.map((rc, idx) => {
    const next = rawChunks[idx + 1];
    const startTs = events[rc.startIndex]?.timestamp ?? 0;
    const endIndex = next ? next.startIndex : events.length;
    const endTs = next ? (events[next.startIndex]?.timestamp ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const slice = events.slice(rc.startIndex, endIndex);
    const raw = attributeChunk(turns, startTs, endTs);
    // The "why" behind each action is the task's own narration. Reusing it costs no tokens.
    const why = rc.narration || null;
    const workLines = groupThinking(raw.workLines).map((l) => ({ ...l, why }));
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

  return {
    sessionId: input.sessionId,
    sessionName: input.sessionName,
    project: input.project,
    color: input.color,
    live: input.live,
    totalTokens: totals.total,
    workTotal: totals.work,
    contextTotal: totals.context,
    taskCount: chunks.length,
    priciestTaskName: priciest ? priciest.name : null,
    chunks,
    activeWarning: null,
  };
}
