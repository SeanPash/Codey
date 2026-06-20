// Throwaway probe: logs every PostToolUse invocation's raw stdin so we can see
// whether Claude Code fires PostToolUse for errored tool calls. Delete after use.
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let s = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  const log = join(tmpdir(), "codey-post-debug.log");
  appendFileSync(log, `--- ${new Date().toISOString()}\n${s}\n`);
  process.exit(0);
});
