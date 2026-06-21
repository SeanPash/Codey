import { attributeChunk } from "./attribution.js";
import type { AssistantTurn } from "./transcript.js";

export interface CostLine {
  label: string;
  tokens: number;
  failed: boolean;
}

export interface CostSummary {
  lines: CostLine[];
  total: number;
  priciest: string | null;
}

export function summarizeCosts(turns: AssistantTurn[]): CostSummary {
  const b = attributeChunk(turns, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  const lines: CostLine[] = b.workLines.map((l) => ({ label: l.label, tokens: l.tokens, failed: l.status === "fail" }));
  // Pick the priciest real task. Skip non-tool turns (thinking) so we never report
  // "Thinking it through" as the headline cost.
  let priciest: string | null = null;
  let max = -1;
  for (const l of b.workLines) {
    if (l.status === "none") continue;
    if (l.tokens > max) { max = l.tokens; priciest = l.label; }
  }
  return { lines, total: b.workTotal, priciest };
}

export function renderCosts(s: CostSummary): string {
  if (s.lines.length === 0) return "No tasks recorded yet.";
  const rows = s.lines.map((l) => `  ${String(l.tokens).padStart(6)}  ${l.label}${l.failed ? " (failed)" : ""}`);
  const tail = [`  Total: ${s.total} tokens`];
  if (s.priciest) tail.push(`  Priciest: ${s.priciest}`);
  return ["Token cost by task (work output tokens):", ...rows, "", ...tail].join("\n");
}
