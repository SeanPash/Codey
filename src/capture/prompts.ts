import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// One JSON object per line: { ts }. The prompt hook appends here so the feed can mark a
// fresh turn each time the user sends a new prompt.
function file(dir: string): string {
  return join(dir, "prompts.jsonl");
}

export function appendPrompt(dir: string, ts: number): void {
  appendFileSync(file(dir), JSON.stringify({ ts }) + "\n");
}

export function readPrompts(dir: string): number[] {
  const p = file(dir);
  if (!existsSync(p)) return [];
  const out: number[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { ts?: unknown };
      if (typeof o.ts === "number") out.push(o.ts);
    } catch {
      // skip a partial or malformed line
    }
  }
  return out;
}
