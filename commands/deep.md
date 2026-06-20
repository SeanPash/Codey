---
description: Turn Codey narration on in deep mode (explains the why)
---

Turn Codey narration on in deep mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode deep
```

Then tell the user in one line that Codey deep narration is on, and that the status
line at the bottom updates with the reason as Claude works. Do not tell the user to open
a separate terminal; the bottom status line is the surface.
