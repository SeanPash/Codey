import type { ToolEvent, Warning } from "../types.js";
import { computeOpenCalls } from "./open-calls.js";
import { detectLoop, detectRepeatError, detectHang } from "./detectors.js";
import { hangThreshold } from "./hang-config.js";

// How many identical steps in a row count as a loop, and how many identical failures count as a
// repeat error. Kept here so every surface that surfaces a warning (the narrator, the watch
// ticker, the off-mode status line) agrees on the same thresholds.
export const LOOP_THRESHOLD = 5;
export const REPEAT_ERROR_THRESHOLD = 3;

// The single "is Claude stuck right now" check, composed once and shared. Loop and repeat-error
// take priority over a hang, since a tight repeat is a more specific signal than mere silence.
export function activeWarning(events: ToolEvent[], now: number): Warning | null {
  const lastActivityTs = events.reduce((m, e) => Math.max(m, e.timestamp), 0) || undefined;
  return (
    detectLoop(events, LOOP_THRESHOLD) ??
    detectRepeatError(events, REPEAT_ERROR_THRESHOLD) ??
    detectHang(computeOpenCalls(events), now, hangThreshold, lastActivityTs)
  );
}
