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

The plugin runs from its built `dist/`, so build first, then install.

1. Build it:

   ```
   npm install
   npm run build
   ```

2. Add this folder as a plugin marketplace and install Codey, from any Claude Code session:

   ```
   /plugin marketplace add /path/to/codey
   /plugin install codey@codey-local
   ```

   Restart the session afterwards so the hooks load.

Installing copies the plugin into Claude Code's plugin cache, so rebuilding the source does
not update the running plugin on its own. After changing code, run `npm run build` again and
reinstall (or update) the plugin so the cache picks up the new `dist/`.

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

## Browser timeline (`codey serve`)

See a session as a visual storyboard with a per-task token breakdown, live or as replay:

    node dist/cli/index.js serve            # newest session, opens on http://localhost:4317
    node dist/cli/index.js serve --session <id> --port 4317

Each task card shows a plain-English recap and where its tokens went: the costly "work" Claude did,
separated from cheap cached "context". Failed steps show their error inline; loop and repeat-error
warnings appear on the task where they happened. The page polls every ~2s, so the same view works
live (with a "live" indicator) and for replaying any past session under `~/.codey/sessions/`.

## Stepping in when Claude is stuck

When a session is live and looping (or repeating an error), the timeline shows an amber bar on the
stuck task with three choices: nudge it to move on, push it toward a different approach, or stop and
hand control back to you. One click blocks Claude's next matching tool call and feeds it a short
reason it reads and acts on. This is a strong nudge, not a guaranteed stop, so each click also shows
you the guaranteed manual path: press Esc to interrupt, then paste the supplied one-line instruction.
No tokens are spent on the intervention, and capture stays observe-only.

## Development

```
npm test           # run the test suite (vitest)
npm run typecheck  # type-check without emitting
npm run build      # compile to dist/
```

## What's next

Intervention from the terminal as well as the browser, so you can step in without leaving
the watch view. Today the intervention bar is browser-only.
