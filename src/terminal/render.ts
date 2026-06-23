import type { Mode } from "../types.js";
import type { LiveCaption } from "../caption/caption.js";

export function renderNarration(text: string): string {
  return `  why: ${text}`;
}

export function renderHeader(mode: Mode): string {
  return `Codey (mode: ${mode}) - watching what Claude is doing`;
}

// The live phase line: a stage chip and the plain-English sentence, not a raw tool call.
export function renderCaption(caption: LiveCaption): string {
  const stage = caption.stage.charAt(0).toUpperCase() + caption.stage.slice(1);
  return `▸ ${stage}: ${caption.simple}`;
}
