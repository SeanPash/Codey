---
description: Show how many tokens each task cost
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" costs
```

Relay the printed list to the user as-is. It shows each task and its token cost, the
total, and the priciest task.
