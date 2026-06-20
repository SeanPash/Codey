---
description: Turn Codey narration on in simple mode (one line, near-zero tokens)
---

Turn Codey narration on in simple mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode simple
```

Then tell the user in one line that Codey simple narration is on, and that the status
line at the bottom updates as Claude works. Do not tell the user to open a separate
terminal; the bottom status line is the surface.
