// Throwaway probe (Task 2): the "narrator" stand-in. Appends a tick every 500ms
// for ~5s, then exits on its own. Launched detached by detach-spawn.mjs.
import { appendFileSync } from "node:fs";

const out = process.argv[2];
let n = 0;
const timer = setInterval(() => {
  n++;
  appendFileSync(out, `tick ${n} ${Date.now()}\n`);
  if (n >= 10) clearInterval(timer);
}, 500);
