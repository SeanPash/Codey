import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";
import { armBudget, clearBudget, readBudget, budgetStatusLine } from "../budget/budget.js";

export type BudgetArg =
  | { kind: "report" }
  | { kind: "clear" }
  | { kind: "arm"; cap: number }
  | { kind: "invalid" };

export function parseBudgetArg(raw: string | undefined): BudgetArg {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return { kind: "report" };
  if (s === "off" || s === "0") return { kind: "clear" };
  const m = /^([\d,]+)(k)?$/.exec(s);
  if (!m) return { kind: "invalid" };
  const n = Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
  if (!Number.isFinite(n) || n <= 0) return { kind: "invalid" };
  return { kind: "arm", cap: n };
}

export function runBudget(raw: string | undefined): void {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const dir = join(defaultRoot(), session);
  const arg = parseBudgetArg(raw);
  switch (arg.kind) {
    case "report":
      console.log(budgetStatusLine(readBudget(dir)));
      return;
    case "clear":
      clearBudget(dir);
      console.log("Budget cleared. Codey explains as usual.");
      return;
    case "arm":
      armBudget(dir, arg.cap);
      console.log(budgetStatusLine(readBudget(dir)));
      return;
    case "invalid":
      console.log("Usage: /codey:budget <tokens>  (e.g. 5000 or 5k), or 'off' to clear.");
      return;
  }
}
