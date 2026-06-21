import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface Budget {
  cap: number;   // token allowance for automatic narration
  spent: number; // tokens spent so far this session
}

function file(dir: string): string {
  return join(dir, "budget.json");
}

export function readBudget(dir: string): Budget | null {
  const p = file(dir);
  if (!existsSync(p)) return null;
  try {
    const o = JSON.parse(readFileSync(p, "utf8")) as Partial<Budget>;
    if (typeof o.cap === "number" && typeof o.spent === "number") return { cap: o.cap, spent: o.spent };
    return null;
  } catch {
    return null;
  }
}

export function armBudget(dir: string, cap: number): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(file(dir), JSON.stringify({ cap, spent: 0 }));
}

export function clearBudget(dir: string): void {
  rmSync(file(dir), { force: true });
}

export function addSpend(dir: string, tokens: number): void {
  const b = readBudget(dir);
  if (!b) return; // uncapped: nothing to meter
  writeFileSync(file(dir), JSON.stringify({ cap: b.cap, spent: b.spent + Math.max(0, tokens) }));
}

// --- pure gate + formatting ---

export function budgetAllows(b: Budget | null): boolean {
  return !b || b.spent < b.cap;
}

export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function budgetLeftLabel(b: Budget | null): string | null {
  if (!b) return null;
  const left = Math.max(0, b.cap - b.spent);
  return left > 0 ? `${formatTokens(left)} left` : "budget reached";
}

export function budgetPausedMessage(b: Budget | null): string | null {
  if (!b || b.spent < b.cap) return null;
  return `Budget reached (${formatTokens(b.spent)} / ${formatTokens(b.cap)}). Auto-explaining paused - /codey:budget <n> to raise it, or /codey:explain for one on demand.`;
}

export function budgetStatusLine(b: Budget | null): string {
  if (!b) return "No budget set. Codey explains as usual. Set one with /codey:budget <tokens>.";
  const left = Math.max(0, b.cap - b.spent);
  return `Budget: ${formatTokens(b.spent)} spent of ${formatTokens(b.cap)} (${formatTokens(left)} left).`;
}
