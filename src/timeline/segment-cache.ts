import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import type { ToolEvent } from "../types.js";
import { naiveSegment, buildSegmentationPrompt, parseSegmentation, type RawChunk } from "./segment.js";
import { runSegmentation } from "../narration/claude-headless.js";

export interface TimelineCache {
  eventCount: number;
  chunks: RawChunk[];
}

// Re-segment only after enough new events to be worth a headless pass.
const STALE_SLACK = 5;

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

// Track in-flight refreshes so polling never starts two passes for one session.
const refreshing = new Set<string>();

// Fire-and-forget: run the headless pass and update the cache if it produces usable chunks.
function refresh(sessionId: string, events: ToolEvent[], root: string): void {
  if (refreshing.has(sessionId)) return;
  refreshing.add(sessionId);
  runSegmentation(buildSegmentationPrompt(events))
    .then((text) => {
      const chunks = text ? parseSegmentation(text, events.length) : [];
      if (chunks.length > 0) writeCache(sessionId, { eventCount: events.length, chunks }, root);
    })
    .catch(() => { /* leave the existing cache in place */ })
    .finally(() => { refreshing.delete(sessionId); });
}

// Synchronous chunk source for a snapshot read: return cached chunks (or naive), and kick off a
// background refresh when stale. Live and replay use the same path; replay simply never goes stale
// after its first pass.
export function chunksFor(sessionId: string, events: ToolEvent[], root: string = defaultRoot()): RawChunk[] {
  const cache = readCache(sessionId, root);
  if (isStale(cache, events.length)) refresh(sessionId, events, root);
  return cache && cache.chunks.length > 0 ? cache.chunks : naiveSegment(events);
}
