# Codey

Live legibility for Claude Code. Codey watches what Claude is doing during a session,
narrates it in plain English, and warns you when Claude looks stuck. The narration runs
through your own Claude Code in headless mode, so there are no external API keys and no
extra services to set up.

## What it does

- **Live narration.** A plain-English story of what Claude is doing, as it happens. Pick
  how much detail you want with Simple or Deep mode.
- **Three warnings** (pure code, no tokens):
  - **Looping** - the same tool and input repeated several times.
  - **Hanging** - a single action running far past a time threshold.
  - **Repeating errors** - the same tool failing with the same error again and again.

## How it works

Codey registers `PreToolUse` and `PostToolUse` hooks. A small hook script records each
tool call as one line of JSON under `~/.codey/sessions/<session>/events.jsonl`. The
`codey watch` process tails that file, runs the warning detectors, asks your own Claude
Code (headless `claude -p --model haiku`) to narrate the recent activity, and prints both
in your terminal.

## Install

1. Install the plugin, pointing Claude Code at this folder (see the Claude Code plugin
   docs for how to add a local plugin).
2. Build it:

   ```
   npm install
   npm run build
   ```

## Use

In a second terminal, while a Claude Code session is running:

```
node dist/cli/index.js watch --mode simple   # short, infrequent narration
node dist/cli/index.js watch --mode deep      # richer narration, explains the why
```

By default it watches the most recent session. Use `--session <id>` to pick a specific
one.

## Modes

- **simple** - narrates occasionally, in one sentence. Minimal token use.
- **deep** - narrates more often and explains why it matters. Uses more of your Claude plan.

Narration draws on your existing Claude plan (the same bucket as normal Claude Code work),
so Deep mode costs more of your quota than Simple.

## Development

```
npm test           # run the test suite (vitest)
npm run typecheck  # type-check without emitting
npm run build      # compile to dist/
```

## What's next

A browser timeline with a per-task token breakdown and session replay, built on the same
JSONL store under `~/.codey/sessions/`.
