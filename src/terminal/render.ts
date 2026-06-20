import type { Mode } from "../types.js";
import type { ActionLabel } from "../statusline/labels.js";

export function renderNarration(text: string): string {
  return `💬  ${text}`;
}

export function renderHeader(mode: Mode): string {
  return `-- Codey (mode: ${mode}) - watching what Claude is doing --`;
}

export function renderAction(label: ActionLabel): string {
  return `▍ [${label.tag}] ${label.target}`;
}
