import type { ToolEvent, Warning, TimelineChunk, SessionSnapshot } from "../types.js";
import type { AssistantTurn } from "../timeline/transcript.js";
import type { RawChunk } from "../timeline/segment.js";
import { attributeChunk } from "../timeline/attribution.js";
import { detectLoop, detectRepeatError } from "../warnings/detectors.js";

const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;

// Warnings that are meaningful from history alone (hang is a live concept, so it is omitted here).
function chunkWarnings(slice: ToolEvent[]): Warning[] {
  const out: Warning[] = [];
  const loop = detectLoop(slice, LOOP_THRESHOLD);
  if (loop) out.push(loop);
  const repeat = detectRepeatError(slice, REPEAT_ERROR_THRESHOLD);
  if (repeat) out.push(repeat);
  return out;
}

export interface SnapshotInput {
  sessionId: string;
  sessionName: string;
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
    const receipt = attributeChunk(turns, startTs, endTs);
    return {
      id: `c${idx}`,
      name: rc.name,
      narration: rc.narration,
      startTs,
      endTs,
      tokenTotal: receipt.workTotal + receipt.contextTotal,
      warnings: chunkWarnings(slice),
      receipt,
    };
  });

  const totalTokens = chunks.reduce((s, c) => s + c.tokenTotal, 0);
  const priciest = chunks.reduce<TimelineChunk | null>((m, c) => (!m || c.tokenTotal > m.tokenTotal ? c : m), null);

  return {
    sessionId: input.sessionId,
    sessionName: input.sessionName,
    live: input.live,
    totalTokens,
    taskCount: chunks.length,
    priciestTaskName: priciest && priciest.tokenTotal > 0 ? priciest.name : null,
    chunks,
    activeWarning: null,
  };
}
