---
description: Turn Codey narration on in deep mode (explains the why)
---

Turn Codey narration on in deep mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode deep
```

Then tell the user in one line that Codey deep narration is on, and that the status
line at the bottom updates with the reason as Claude works. Then add a line telling
them they can run `/timeline` to open the visual storyboard of the session in their
browser, with a per-task token breakdown. The command prints a `... feed` line: offer
it once after that, telling the user they can open a new terminal and run that exact
command to see the full scrollable task history if they want. Keep the status line as
the main surface; do not push the terminal.
