---
description: Turn Codey narration on in deep mode (explains the why)
---

Turn Codey narration on in deep mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode deep
```

Then tell the user in one line that Codey deep narration is on, and that the status
line at the bottom updates with the reason as Claude works. The command prints a
`... feed` line: offer it once as an option, telling the user they can open a new
terminal and run that exact command to see the full scrollable task history if they
want. Keep the status line as the main surface; do not push the terminal.
