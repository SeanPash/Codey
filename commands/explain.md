---
description: Explain the last thing in depth; run again to go deeper
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" explain
```

Relay the printed explanation to the user verbatim, with no preamble. If they run
/codey:explain again for the same task, it returns a deeper explanation; just relay that
one too.
