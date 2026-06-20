# Spike Findings: Live Status Line and Install (Plan 1 of the marketplace spec)

Date: 2026-06-20. Goal: de-risk the two assumptions this plan rests on before
building the status-line surface.

## Task 1: Multi-line status-line rendering (CONFIRMED multi-line)

Set a temporary `statusLine` in `~/.claude/settings.json` that printed two lines via
`node -e` (portable on Windows, unlike `printf`):

```json
"statusLine": { "type": "command", "command": "node -e \"process.stdout.write('line one\\nline two ...')\"" }
```

Observed live: Claude Code rendered **both** lines. The long second line was shown in
full, not cut off or wrapped, at well under the terminal width.

Decision: `render.ts` emits **two lines** as the design intends:

```
codey  [editing]    auth.ts
  why: adding validation so empty logins get rejected
```

Line 1 is the terse tagged action (free, written by capture). Line 2 is the indented
`why:` (or the warning, when one is active). The single-line collapse-and-truncate
fallback noted in Task 6 is not needed.

## Task 2: Narrator trigger and toggle lifecycle (DECIDED: Daemon)

### Detached background process survives its launcher (CONFIRMED on Windows)

`detach-spawn.mjs` spawned `detach-writer.mjs` with `{ detached: true, stdio: "ignore" }`
plus `child.unref()`, then exited immediately. The launcher returned at
`21:05:27.519Z`, yet the writer went on to append all 10 ticks at 500ms intervals,
the last landing ~4.6s later, entirely after the launcher was gone. So the
`turnOn` spawn pattern in Task 10 works as written on Windows.

### Status line reads a file and never blocks (CONFIRMED live)

`live-writer.mjs` (detached) rewrote a snapshot file every 2s while `statusLine`
pointed at `live-read.mjs`, a pure file read. The status line updated on its own each
refresh and the session stayed responsive, because the status-line command only reads
a file; all the slow work (and later the `claude -p` call) happens in the detached
process, never in the refresh path.

### Live settings pickup (CONFIRMED, carried from Task 1)

Writing `statusLine` into `~/.claude/settings.json` took effect with no restart, so the
`/codey` slash command can toggle it on/off by editing settings (Task 10), the same
mechanism used here by hand.

### Decision: Daemon, not Heartbeat

`codey on` writes the `statusLine` entry and spawns a detached `codey narrate`; `codey
off` removes the entry. The status-line command stays a trivial, always-fast file read.
This is the model Tasks 8-10 are written for. Heartbeat (status line spawns the
narrator) is rejected: it would put process spawning in the refresh hot path, ties
throttling to an irregular refresh cadence, and is harder to test. Daemon keeps the
slow work in one cleanly-stoppable process and the read path pure.

## Visualization decision: status line + rich `codey watch` pane

The bottom status line is the only async-safe surface inside the main session, and it
is small. An outside process cannot draw into Claude's transcript. So the live view
splits across two zones, as the spec intends:

- **Status line (zone in the main session):** the punchy always-on glance. `render.ts`
  leans into color (a `codey` bar, a bold tag, a `why` line, a distinct color for
  `[stuck]`) so it reads at a glance despite being the bottom strip.
- **`codey watch` (a separate pane Codey owns):** the rich, roomy view with scrollback,
  reused for `teach` mode where the explanation overflows the bar. This command already
  exists; a later task points it at the new `labels.ts` and a fuller renderer rather
  than building a second view from scratch.

Both run off the same JSONL store and snapshot, so they stay in sync. This keeps Plan 1
focused on the status line while making the bigger terminal view a small addition on top
of code that already exists.

