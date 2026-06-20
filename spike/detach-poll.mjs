// Throwaway probe (Task 2): runs entirely AFTER detach-spawn's parent has exited.
// Samples the output file once a second; if the line count keeps growing here, the
// detached writer outlived its launcher.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "detach-out.txt");
const start = Date.now();

function lineCount() {
  try {
    return readFileSync(out, "utf8").split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

const timer = setInterval(() => {
  console.log(`+${Date.now() - start}ms -> ${lineCount()} lines`);
  if (Date.now() - start > 6000) {
    clearInterval(timer);
    console.log("final: " + lineCount() + " lines");
  }
}, 1000);
