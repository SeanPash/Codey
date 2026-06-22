import type { ReceiptLine } from "../types.js";

function thinkingRow(tokens: number, ts: number, nextLabel: string | null): ReceiptLine {
  const label = nextLabel
    ? `Planned before ${nextLabel.charAt(0).toLowerCase()}${nextLabel.slice(1)}`
    : "Planned the next steps";
  return { label, tool: "thinking", tokens, status: "none", errorText: null, resolved: false, raw: null, why: null, failSummary: null, ts };
}

// Collapse each run of consecutive thinking lines (status "none") into a single row.
// The row is tied to the action it leads into, so the receipt reads as a story, not a
// stack of identical "Thinking it through" lines. No thinking text exists to show. The
// merged row keeps the timestamp of where the run started.
export function groupThinking(lines: ReceiptLine[]): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  let runTokens = 0;
  let runTs = 0;
  let inRun = false;
  for (const l of lines) {
    if (l.status === "none") { if (!inRun) runTs = l.ts; runTokens += l.tokens; inRun = true; continue; }
    if (inRun) { out.push(thinkingRow(runTokens, runTs, l.label)); runTokens = 0; inRun = false; }
    out.push(l);
  }
  if (inRun) out.push(thinkingRow(runTokens, runTs, null));
  return out;
}
