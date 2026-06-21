import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// One JSON object per line: { scope, text }. scope identifies what was explained (a whole
// turn, e.g. "300", or a single task in it, e.g. "300:t2"), so deepening accumulates per
// scope and resets cleanly when a new prompt starts a new turn.
function file(dir: string): string {
  return join(dir, "explain.jsonl");
}

export function appendPass(dir: string, scope: string, text: string): void {
  appendFileSync(file(dir), JSON.stringify({ scope, text }) + "\n");
}

export function passesForScope(dir: string, scope: string): string[] {
  const p = file(dir);
  if (!existsSync(p)) return [];
  const out: string[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { scope?: unknown; text?: unknown };
      if (o.scope === scope && typeof o.text === "string") out.push(o.text);
    } catch {
      // skip a partial line
    }
  }
  return out;
}
