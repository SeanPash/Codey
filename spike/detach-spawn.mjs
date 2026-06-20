// Throwaway probe (Task 2): stands in for `codey on`. Spawns the writer detached
// and unref'd, then exits immediately. If the writer keeps running after this
// process is gone, the Daemon model is safe on Windows.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "detach-out.txt");
writeFileSync(out, ""); // reset between runs

const child = spawn(process.execPath, [join(here, "detach-writer.mjs"), out], {
  detached: true,
  stdio: "ignore",
});
child.unref();

console.log("spawned writer pid=" + child.pid);
console.log("parent exiting immediately at " + new Date().toISOString());
