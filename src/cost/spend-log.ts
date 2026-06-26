import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SpendEntry } from "../types.js";

// One line per headless call Codey makes, so the timeline and statusline can show exactly what
// Codey itself cost, separate from Claude's own work.
function file(dir: string): string {
  return join(dir, "codey-spend.jsonl");
}

export function appendSpend(dir: string, entry: SpendEntry): void {
  try {
    appendFileSync(file(dir), JSON.stringify(entry) + "\n");
  } catch {
    // Best-effort accounting: a failed write must never break a narration or segmentation pass.
  }
}

export function readSpend(dir: string): SpendEntry[] {
  const p = file(dir);
  if (!existsSync(p)) return [];
  const out: SpendEntry[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as SpendEntry); } catch { /* skip a torn line */ }
  }
  return out;
}
