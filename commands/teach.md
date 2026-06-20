---
description: Turn Codey narration on in teach mode (explains and teaches the concepts)
---

Turn Codey narration on in teach mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode teach
```

Then tell the user in one line that Codey teach narration is on and that the status line
at the bottom updates as Claude works. Do not tell the user to open a separate terminal;
the status line is the surface. If they want a roomier view they can optionally run
`codey watch`, but only mention that if they ask.
