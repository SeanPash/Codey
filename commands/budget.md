---
description: Cap how many tokens Codey spends explaining; it pauses when reached
---

Run, passing along whatever the user typed after the command as the amount:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" budget $ARGUMENTS
```

Relay the line it prints. Briefly remind the user that they set an amount like
`/codey:budget 5000` (or `5k`), that auto-explaining pauses once that many tokens are
spent, that `/codey:budget` with no number reports what is left, and `/codey:budget off`
clears it.
