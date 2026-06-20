import type { Mode } from "../types.js";

export function renderNarration(text: string): string {
  return `💬  ${text}`;
}

export function renderHeader(mode: Mode): string {
  return `-- Codey (mode: ${mode}) - watching what Claude is doing --`;
}
