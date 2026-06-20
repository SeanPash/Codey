# Codey

Live legibility for Claude Code. Codey watches what Claude is doing during a session,
narrates it in plain English right in your status line, and warns you when Claude looks
stuck. The narration runs through your own Claude Code in headless mode, so there are no
external API keys and no extra services to set up.

## What it does

- **Live narration in the status line.** A plain-English line at the bottom of your
  session: the current action on top, the reason underneath, updated as Claude works.
  Pick how much detail you want with simple, deep, or teach mode.
- **Three warnings** (pure code, no tokens):
  - **Looping** - the same tool and input repeated several times.
  - **Hanging** - a single action running far past a time threshold.
  - **Repeating errors** - the same tool failing with the same error again and again.

## How it works

Codey registers `PreToolUse` and `PostToolUse` hooks. A small hook script records each
tool call as one line of JSON under `~/.codey/sessions/<session>/events.jsonl`, and
writes the terse current action straight to the status line for free. A background
narrator (`claude -p --model haiku`, on your own login) reads the recent activity, writes
the plain-English "why" into the status line, and raises a warning when Claude looks
stuck. The status line is the only surface an out-of-band process can update live, which
is why narration lives there. The `codey watch` command shows the same thing in a roomy
split pane with scrollback.

## Install

From any Claude Code session:

```
/plugin marketplace add SeanPash/Codey
/plugin install codey@codey
```

Restart the session so the hooks load. No build step: Codey ships prebuilt.

## Use

Turn narration on and pick a depth. Type `/codey` and the picker lists these:

```
/codey:simple    one-line, near-zero tokens
/codey:deep      explains the why
/codey:teach     explains and teaches the concepts
/codey:off       stop narrating
```

Claude Code namespaces plugin commands as `plugin:command`, so the `codey:` prefix is
the plugin name.

Watch the status line at the bottom of your session. The top line is the current action;
the second line is the plain-English reason (or a warning when Claude looks stuck).
Capture runs silently for free whether or not narration is on.

For a bigger view with scrollback (and room for teach mode), open the watch pane in a
separate terminal from a clone of this repo:

```
node dist/cli/index.js watch --mode deep
```

## Modes

- **simple** - one sentence, occasionally. Near-zero tokens.
- **deep** - more often, explains why it matters. Uses more of your plan.
- **teach** - explains and teaches the concepts behind the work, for someone learning.
  The richest and most token-heavy; it gets the most room in the `codey watch` pane.

Narration draws on your existing Claude plan (the same bucket as normal Claude Code work),
so deeper modes cost more of your quota.

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

This plugin ships its compiled `dist/`. After changing source, run `npm run build` and
commit the updated `dist/` so installs stay current.

## What's next

Intervention from the terminal as well as the browser, so you can step in without leaving
the watch view. Today the intervention bar is browser-only.
