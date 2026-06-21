import type { WhyEntry } from "../narration/history.js";

// How long a line takes to read, used to pace cards and explanations. Tuned so a short
// line gets a comfortable few seconds and a long deep explanation gets enough time to
// finish, without ever stalling the ticker.
const PER_WORD_MS = 350;
const MIN_MS = 4000;
const MAX_MS = 12000;

export function readMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(MAX_MS, Math.max(MIN_MS, words * PER_WORD_MS));
}

// Pick which explanation should be on screen now: hold each one for its own read-time
// before letting a newer one replace it. Mirrors the card scheduler so the why and the
// task advance on the same readable cadence.
export function scheduleWhy(whys: WhyEntry[], now: number): string | null {
  if (whys.length === 0) return null;
  let shownAt = whys[0].ts;
  let displayed = 0;
  for (let i = 1; i < whys.length; i++) {
    const earliest = Math.max(whys[i].ts, shownAt + readMs(whys[displayed].why));
    if (earliest > now) break;
    shownAt = earliest;
    displayed = i;
  }
  return whys[displayed].why;
}
