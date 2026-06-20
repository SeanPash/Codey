#!/usr/bin/env node
import { Command } from "commander";
import { runWatch } from "./watch.js";
import { latestSessionId } from "./sessions.js";
import type { Mode } from "../types.js";

const program = new Command();
program.name("codey").description("Live legibility for Claude Code");

program
  .command("watch")
  .description("Watch the current Claude Code session and narrate what it's doing")
  .option("-m, --mode <mode>", "narration depth: simple | deep", "simple")
  .option("-s, --session <id>", "session id to watch (defaults to most recent)")
  .action((opts: { mode: string; session?: string }) => {
    const mode: Mode = opts.mode === "deep" ? "deep" : "simple";
    const session = opts.session ?? latestSessionId();
    if (!session) {
      console.error("No Codey sessions found yet. Start a Claude Code session with the plugin enabled, then run `codey watch`.");
      process.exit(1);
    }
    runWatch(session, mode);
  });

program.parseAsync(process.argv);
