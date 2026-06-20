import type { ToolEvent } from "../types.js";
import { actionLabel, type ActionLabel } from "./labels.js";

// Only "pre" events change what Claude is currently doing.
export function actionFromEvent(e: ToolEvent): ActionLabel | null {
  if (e.phase !== "pre") return null;
  return actionLabel(e.tool, e.input);
}
