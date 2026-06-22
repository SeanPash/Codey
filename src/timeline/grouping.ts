import type { ReceiptLine } from "../types.js";

// A trailing run of thinking with no action to fold into: show it plainly on its own. No
// thinking text exists to reveal, so the row is just a marker that Claude paused to think.
function loneThinkRow(tokens: number, ts: number): ReceiptLine {
  return { label: "Thought about what to do next.", tool: "thinking", tokens, status: "none",
    errorText: null, resolved: false, raw: null, why: null, failSummary: null, ts, thoughtFirst: false };
}

// Fold each run of consecutive thinking lines (status "none") into the action that follows it,
// rather than leaving a separate "Thought it through" row. The action row absorbs the thinking
// tokens and is tagged `thoughtFirst`, so the receipt reads as one step ("Reading grouping.ts",
// with a quiet "thought first" note on expand) instead of a duplicate think row plus the action.
// A thinking run at the very end, with nothing to lead into, keeps its own plain row.
export function groupThinking(lines: ReceiptLine[]): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  let runTokens = 0;
  let runTs = 0;
  let inRun = false;
  for (const l of lines) {
    if (l.status === "none") { if (!inRun) runTs = l.ts; runTokens += l.tokens; inRun = true; continue; }
    if (inRun) {
      out.push({ ...l, tokens: l.tokens + runTokens, thoughtFirst: true });
      runTokens = 0; inRun = false;
      continue;
    }
    out.push(l);
  }
  if (inRun) out.push(loneThinkRow(runTokens, runTs));
  return out;
}
