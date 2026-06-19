// Spike probe: dump whatever Claude Code sends to a PreToolUse/PostToolUse hook.
// Writes each raw payload as one JSON line next to this file, then exits 0 so it
// never disrupts the tool flow. Temporary - removed after the spike.
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dumpFile = join(dirname(fileURLToPath(import.meta.url)), "hook-dump.jsonl");

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  appendFileSync(dumpFile, raw.trim() + "\n");
  process.exit(0);
});
