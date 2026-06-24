import type { Mode } from "../types.js";
import type { LiveCaption } from "../caption/caption.js";

export function renderNarration(text: string): string {
  return `  why: ${text}`;
}

export function renderHeader(mode: Mode): string {
  return `Codey (mode: ${mode}) - watching what Claude is doing`;
}

// The live phase: the purpose title leads, the plain-English sentence sits under it. Raw
// paths and commands stay out of the live line so a long temp path never dominates.
export function renderCaption(caption: LiveCaption): string {
  return `▸ ${caption.title}\n    ${caption.simple}`;
}
