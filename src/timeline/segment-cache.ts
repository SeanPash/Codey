import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import type { ToolEvent } from "../types.js";
import { naiveSegment, buildSegmentationPrompt, parseSegmentation, type RawChunk } from "./segment.js";
import { runSegmentationMetered } from "../narration/claude-headless.js";
import { appendSpend } from "../cost/spend-log.js";

export interface TimelineCache {
  eventCount: number;
  chunks: RawChunk[];
  // When the last AI segmentation finished. Drives the time floor so a busy live turn cannot
  // fire a fresh headless pass every couple of seconds. Optional so older caches still load.
  segmentedAt?: number;
}

// Re-segment only after enough new events to be worth a headless pass.
const STALE_SLACK = 10;

// The shortest gap between two AI segmentations of the same live turn. The free NOW strip and the
// deterministic per-event actions keep the page feeling live between passes, so the costly
// re-grouping can run far less often without the timeline looking frozen.
const MIN_LIVE_SEGMENT_MS = 15_000;

function cachePath(sessionId: string, root: string): string {
  return join(root, sessionId, "timeline.json");
}

export function readCache(sessionId: string, root: string = defaultRoot()): TimelineCache | null {
  const file = cachePath(sessionId, root);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as TimelineCache;
  } catch {
    return null;
  }
}

export function writeCache(sessionId: string, cache: TimelineCache, root: string = defaultRoot()): void {
  mkdirSync(join(root, sessionId), { recursive: true });
  writeFileSync(cachePath(sessionId, root), JSON.stringify(cache));
}

export function isStale(cache: TimelineCache | null, eventCount: number): boolean {
  if (!cache) return true;
  return eventCount - cache.eventCount > STALE_SLACK;
}

// Where the next segmentation pass is allowed to start. Completed prompts are frozen: once a
// turn ends, its tasks (names, boundaries, narration) never change again, so a finished prompt
// you have already read does not silently rewrite itself, and any explanation generated for it
// stays attached. Only the live turn keeps re-segmenting as Claude works.
//  - No cache yet: segment the whole session once (lock 0), even when idle.
//  - Live: re-segment only from the current turn's first event; everything before is frozen.
//  - Idle with a cache: do not re-segment at all (the timeline is locked as it stands).
export interface SegmentPlan { refresh: boolean; lockBefore: number; }
export function segmentPlan(
  cache: TimelineCache | null, eventCount: number, live: boolean, turnStartIndex: number,
  nowMs: number = Date.now(),
): SegmentPlan {
  if (eventCount === 0) return { refresh: false, lockBefore: 0 };
  if (!cache) return { refresh: true, lockBefore: 0 };
  const lockBefore = Math.max(0, Math.min(turnStartIndex, eventCount));
  // A cache with no segmentedAt predates the floor; treat it as long past so it can refresh.
  const sinceLast = nowMs - (cache.segmentedAt ?? 0);
  const pastFloor = sinceLast >= MIN_LIVE_SEGMENT_MS;
  const refresh = live && isStale(cache, eventCount) && lockBefore < eventCount && pastFloor;
  return { refresh, lockBefore };
}

// Combine the frozen chunks (those before the live turn) with a fresh segmentation of the live
// turn's events. The tail is segmented in isolation, so its indices are slice-relative; we shift
// them back onto the full event list. The seam falls exactly on the turn boundary, which is where
// a fresh task should begin anyway.
export function mergeSegmentation(prev: RawChunk[], tail: RawChunk[], lockBefore: number): RawChunk[] {
  const frozen = prev.filter((c) => c.startIndex < lockBefore);
  const shifted = tail.map((c) => ({ ...c, startIndex: c.startIndex + lockBefore }));
  const merged = [...frozen, ...shifted].sort((a, b) => a.startIndex - b.startIndex);
  if (merged.length === 0) return [];
  merged[0] = { ...merged[0], startIndex: 0 };
  const seen = new Set<number>();
  return merged.filter((c) => (seen.has(c.startIndex) ? false : (seen.add(c.startIndex), true)));
}

// Track in-flight refreshes so polling never starts two passes for one session.
const refreshing = new Set<string>();

// Fire-and-forget: segment only the unfrozen tail, merge it onto the frozen head, and write the
// cache if the pass produced usable chunks.
function refresh(sessionId: string, events: ToolEvent[], lockBefore: number, prev: RawChunk[], root: string): void {
  if (refreshing.has(sessionId)) return;
  refreshing.add(sessionId);
  const slice = events.slice(lockBefore);
  runSegmentationMetered(buildSegmentationPrompt(slice))
    .then((res) => {
      if (res) {
        appendSpend(join(root, sessionId), {
          ts: Date.now(), kind: "timeline", mode: null, usage: res.usage, costUsd: res.costUsd,
        });
      }
      const tail = res?.text ? parseSegmentation(res.text, slice.length) : [];
      if (tail.length === 0) return;
      const chunks = mergeSegmentation(prev, tail, lockBefore);
      if (chunks.length > 0) {
        writeCache(sessionId, { eventCount: events.length, chunks, segmentedAt: Date.now() }, root);
      }
    })
    .catch(() => { /* leave the existing cache in place */ })
    .finally(() => { refreshing.delete(sessionId); });
}

export interface ChunksOpts { live: boolean; turnStartIndex: number; }

// Synchronous chunk source for a snapshot read: return cached chunks (or naive), and kick off a
// background refresh of the live turn when it is stale. Completed prompts stay frozen.
export function chunksFor(
  sessionId: string, events: ToolEvent[], root: string = defaultRoot(),
  opts: ChunksOpts = { live: true, turnStartIndex: 0 },
): RawChunk[] {
  const cache = readCache(sessionId, root);
  const plan = segmentPlan(cache, events.length, opts.live, opts.turnStartIndex);
  if (plan.refresh) refresh(sessionId, events, plan.lockBefore, cache?.chunks ?? [], root);
  return cache && cache.chunks.length > 0 ? cache.chunks : naiveSegment(events);
}
