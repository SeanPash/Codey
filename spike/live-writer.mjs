// Throwaway probe (Task 2): stands in for the detached background narrator. Rewrites
// the snapshot file every 2s with a new two-line frame, then exits. Launched detached
// so it keeps updating while the session stays responsive.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "live-status.txt");

const frames = [
  "codey  [reading]    config.ts\n  why: getting its bearings on the project layout",
  "codey  [editing]    auth.ts\n  why: adding validation so empty logins get rejected",
  "codey  [running]    npm test\n  why: checking the new validation actually passes",
  "codey  [searching]  validateUser\n  why: making sure nothing else calls the old signature",
];

let i = 0;
writeFileSync(out, frames[0]);
const timer = setInterval(() => {
  i++;
  writeFileSync(out, frames[i % frames.length]);
  if (i >= 12) clearInterval(timer); // ~24s of updates, then stop
}, 2000);
