---
description: Free live labels; pull a full why with /codey:explain when you want it
---

Turn Codey narration on in ask mode by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode ask
```

Then tell the user in one line that Codey is in ask mode: the status line shows what
Claude is doing for free, and they can run /codey:explain anytime to spend a little to
hear why. No narration tokens are spent until they ask.
