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
