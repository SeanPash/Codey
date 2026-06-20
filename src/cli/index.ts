#!/usr/bin/env node
import { Command } from "commander";
import { runWatch } from "./watch.js";
import { runNarrate } from "./narrate.js";
import { runStatusLine } from "./statusline.js";
import { runServe } from "./serve.js";
import { latestSessionId } from "./sessions.js";
import type { Mode } from "../types.js";

function parseMode(m: string): Mode {
  return (["simple", "deep", "teach"].includes(m) ? m : "simple") as Mode;
}

const program = new Command();
program.name("codey").description("Live legibility for Claude Code");

program
  .command("watch")
  .description("Watch the current Claude Code session and narrate what it's doing")
  .option("-m, --mode <mode>", "narration depth: simple | deep | teach", "simple")
  .option("-s, --session <id>", "session id to watch (defaults to most recent)")
  .action((opts: { mode: string; session?: string }) => {
    const mode = parseMode(opts.mode);
    const session = opts.session ?? latestSessionId();
    if (!session) {
      console.error("No Codey sessions found yet. Start a Claude Code session with the plugin enabled, then run `codey watch`.");
      process.exit(1);
    }
    runWatch(session, mode);
  });

program
  .command("serve")
  .description("Open the browser timeline for a Claude Code session")
  .option("-s, --session <id>", "session id to open (defaults to most recent)")
  .option("-p, --port <port>", "port to serve on", "4317")
  .action((opts: { session?: string; port: string }) => {
    runServe({ session: opts.session, port: Number(opts.port) || 4317 });
  });

program
  .command("narrate")
  .description("Background narrator that feeds the status line")
  .option("-m, --mode <mode>", "narration depth: simple | deep | teach", "simple")
  .option("-s, --session <id>", "session id (defaults to most recent)")
  .action((opts: { mode: string; session?: string }) => {
    const mode = parseMode(opts.mode);
    const session = opts.session ?? latestSessionId();
    if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
    runNarrate(session, mode);
  });

program
  .command("statusline")
  .description("Print the Codey status line (called by Claude Code)")
  .action(() => runStatusLine());

program.parseAsync(process.argv);
