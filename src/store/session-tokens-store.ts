import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const TOKENS_FILE = "tokens.json";

// Read a session's persisted work-token total. The snapshot writes it when the session is opened;
// unopened sessions have no file and read as 0. Cheap enough for the sidebar to read on every poll.
export function readTokens(dir: string): number {
  const file = join(dir, TOKENS_FILE);
  if (!existsSync(file)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { tokens?: unknown };
    return typeof parsed.tokens === "number" && isFinite(parsed.tokens) ? parsed.tokens : 0;
  } catch {
    return 0;
  }
}

// Persist a session's work-token total so the sidebar can sort by it without reparsing transcripts.
export function writeTokens(dir: string, tokens: number): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, TOKENS_FILE), JSON.stringify({ tokens }));
}
