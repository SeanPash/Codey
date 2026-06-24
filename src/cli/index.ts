#!/usr/bin/env node
import { Command } from "commander";
import { runWatch } from "./watch.js";
import { runNarrate } from "./narrate.js";
import { runStatusLine } from "./statusline.js";
import { runServe } from "./serve.js";
import { runFeed } from "./feed.js";
import { latestSessionId } from "./sessions.js";
import { turnOn, turnOff } from "./toggle.js";
import { runTimeline } from "./timeline.js";
import { readStatus } from "../statusline/state.js";
import { defaultRoot } from "../store/session-store.js";
import { join } from "node:path";
import type { Mode } from "../types.js";

function parseMode(m: string): Mode {
  return (["simple", "deep", "teach"].includes(m) ? m : "simple") as Mode;
}

// Use the depth the session was turned on with, unless the user passed --mode.
function resolveWatchMode(opt: string | undefined, session: string): Mode {
  if (opt) return parseMode(opt);
  const snap = readStatus(join(defaultRoot(), session));
  return snap?.mode ?? "simple";
}

const program = new Command();
program.name("codey").description("Live legibility for Claude Code");

program
  .command("watch")
  .description("Watch the current Claude Code session and narrate what it's doing")
  .option("-m, --mode <mode>", "narration depth: simple | deep | teach (defaults to the session's mode)")
  .option("-s, --session <id>", "session id to watch (defaults to most recent)")
  .action((opts: { mode?: string; session?: string }) => {
    const session = opts.session ?? latestSessionId();
    if (!session) {
      console.error("No Codey sessions found yet. Start a Claude Code session with the plugin enabled, then run `codey watch`.");
      process.exit(1);
    }
    runWatch(session, resolveWatchMode(opts.mode, session));
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
  .command("feed")
  .description("Scrollable terminal view of every task and why in this session")
  .option("-s, --session <id>", "session id to show (defaults to most recent)")
  .action((opts: { session?: string }) => {
    const session = opts.session ?? latestSessionId();
    if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
    runFeed(session);
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

program
  .command("on")
  .description("Turn narration on in the status line")
  .option("-m, --mode <mode>", "simple | deep | teach", "simple")
  .action((opts: { mode: string }) => {
    const mode = parseMode(opts.mode);
    const session = latestSessionId();
    if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
    turnOn(mode, session);
    console.log(`Codey narration on (${mode}).`);
    // Print the resolved path so it can be pasted into a fresh terminal where
    // CLAUDE_PLUGIN_ROOT is not set.
    console.log("For the full scrollable task history, run this in a new terminal:");
    console.log(`  node "${process.argv[1]}" feed`);
  });

program
  .command("timeline")
  .description("Open the browser timeline for this session, reusing a running one")
  .action(() => { void runTimeline(); });

program
  .command("off")
  .description("Turn narration off and restore the plain status line")
  .action(() => {
    const session = latestSessionId();
    if (session) turnOff(session);
    console.log("Codey narration off.");
  });

program.parseAsync(process.argv);
