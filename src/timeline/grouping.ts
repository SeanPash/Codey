import type { ReceiptLine } from "../types.js";

// A trailing run of thinking with no action to fold into, shown on its own. When the last thought
// left a real decision (its caption names the choice and it is marked explainable), we keep that
// decision row so the viewer reads what Claude was weighing. Otherwise the run had no concrete
// content, so we show an honest planning marker and mark it not-explainable, which hides the
// "explain this step" button instead of generating empty "paused and reflected" filler.
function loneThinkRow(run: ReceiptLine[]): ReceiptLine {
  const tokens = run.reduce((sum, l) => sum + l.tokens, 0);
  const last = run[run.length - 1];
  if (last && last.explainable !== false && last.why) {
    return { ...last, tokens, thoughtFirst: false };
  }
  return { label: "Thought about the next step.", title: "Planning the next step",
    subtitle: "Claude weighed the next step before continuing.", tool: "thinking", tokens, status: "none",
    errorText: null, resolved: false, raw: null, why: last?.why ?? null, failSummary: null,
    ts: run[0]?.ts ?? 0, thoughtFirst: false, explainable: false };
}

// Fold each run of consecutive thinking lines (status "none") into the action that follows it,
// rather than leaving a separate think row. The action row absorbs the thinking tokens and is
// tagged `thoughtFirst`, so the receipt reads as one step ("Reading grouping.ts", with a quiet
// "thought first" note on expand) instead of a duplicate think row plus the action. A thinking
// run at the very end, with nothing to lead into, keeps its own row via loneThinkRow.
export function groupThinking(lines: ReceiptLine[]): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  let run: ReceiptLine[] = [];
  for (const l of lines) {
    if (l.status === "none") { run.push(l); continue; }
    if (run.length) {
      const runTokens = run.reduce((sum, r) => sum + r.tokens, 0);
      out.push({ ...l, tokens: l.tokens + runTokens, thoughtFirst: true });
      run = [];
      continue;
    }
    out.push(l);
  }
  if (run.length) out.push(loneThinkRow(run));
  return out;
}
