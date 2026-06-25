import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface WhyEntry {
  ts: number;
  why: string;
}

function file(dir: string): string {
  return join(dir, "narration.jsonl");
}

export function appendWhy(dir: string, entry: WhyEntry): void {
  try {
    appendFileSync(file(dir), JSON.stringify(entry) + "\n");
  } catch {
    // Best-effort log: a failed why write (missing dir, full disk) must never break a tick.
  }
}

export function readWhys(dir: string): WhyEntry[] {
  const p = file(dir);
  if (!existsSync(p)) return [];
  const out: WhyEntry[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as WhyEntry); } catch { /* skip a partial line */ }
  }
  return out;
}
