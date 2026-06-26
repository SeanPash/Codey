import type { SpendEntry, SpendTotals, CodeyOverhead, Mode, Usage } from "../types.js";

function tokensOf(u: Usage): number {
  return u.input + u.output + u.cacheRead + u.cacheWrite;
}

function add(t: SpendTotals, e: SpendEntry): SpendTotals {
  return { calls: t.calls + 1, tokens: t.tokens + tokensOf(e.usage), costUsd: t.costUsd + e.costUsd };
}

function zero(): SpendTotals {
  return { calls: 0, tokens: 0, costUsd: 0 };
}

// Roll a session's logged headless calls into the overhead Codey reports: an overall total, a split
// of live narration vs the timeline segmenter, and a per-mode breakdown of the narration calls.
export function summarizeSpend(entries: SpendEntry[]): CodeyOverhead {
  const out: CodeyOverhead = {
    total: zero(),
    byKind: { narration: zero(), timeline: zero() },
    byMode: {},
  };
  for (const e of entries) {
    out.total = add(out.total, e);
    out.byKind[e.kind] = add(out.byKind[e.kind], e);
    if (e.kind === "narration" && e.mode) {
      const m = e.mode as Mode;
      out.byMode[m] = add(out.byMode[m] ?? zero(), e);
    }
  }
  return out;
}
