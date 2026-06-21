import type { ToolEvent, Warning } from "../types.js";
import { computeOpenCalls } from "../warnings/open-calls.js";
import { detectLoop, detectRepeatError, detectHang } from "../warnings/detectors.js";
import { hangThreshold } from "../warnings/hang-config.js";

const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;

// The single "what is Claude stuck on right now" resolver, shared by the snapshot (UI trigger) and
// the writer (file contents). Same precedence and thresholds as the terminal watcher.
export function resolveActiveWarning(events: ToolEvent[], now: number): Warning | null {
  return (
    detectLoop(events, LOOP_THRESHOLD) ??
    detectRepeatError(events, REPEAT_ERROR_THRESHOLD) ??
    detectHang(computeOpenCalls(events), now, hangThreshold)
  );
}
