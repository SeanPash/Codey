// Throwaway probe (Task 2): stands in for `codey statusline`. Pure file read, so it
// returns instantly and never blocks the session, no matter what the narrator does.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.stdout.write(readFileSync(join(here, "live-status.txt"), "utf8"));
} catch {
  process.stdout.write("codey  waiting for activity");
}
