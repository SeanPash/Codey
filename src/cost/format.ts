import type { CodeyOverhead } from "../types.js";
import { formatTokens } from "../budget/budget.js";

// A cost estimate small enough to round to zero still happened, so show "<$0.01" rather than a
// misleading "$0.00". True zero (no calls) stays "$0.00".
export function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

// The one-line statusline footer for a finished turn, or null when Codey spent nothing (so the
// footer is not cluttered with a zero). Tokens are exact; cost is the cache-aware estimate.
export function overheadFooter(o: CodeyOverhead): string | null {
  if (o.total.tokens === 0) return null;
  return `Codey used ${formatTokens(o.total.tokens)} tok (~${formatUsd(o.total.costUsd)}) this turn.`;
}
