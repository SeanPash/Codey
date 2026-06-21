import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// One JSON object per line: { turn, text }. turn is the prompt timestamp the pass belongs
// to, so deepening resets cleanly when a new prompt starts a new turn.
function file(dir: string): string {
  return join(dir, "explain.jsonl");
}

export function appendPass(dir: string, turn: number, text: string): void {
  appendFileSync(file(dir), JSON.stringify({ turn, text }) + "\n");
}

export function passesForTurn(dir: string, turn: number): string[] {
  const p = file(dir);
  if (!existsSync(p)) return [];
  const out: string[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { turn?: unknown; text?: unknown };
      if (o.turn === turn && typeof o.text === "string") out.push(o.text);
    } catch {
      // skip a partial line
    }
  }
  return out;
}
