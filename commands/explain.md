---
description: Explain the last thing in depth; run again to go deeper
---

Run, passing along whatever the user typed after the command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" explain $ARGUMENTS
```

Relay the printed explanation to the user verbatim, with no preamble.

The arguments are optional and can be combined in any order:
- a depth word `simple`, `deep`, or `teach` (default `deep`) sets how rich the explanation
  is, e.g. `/codey:explain teach`.
- a task number focuses on one step from the current turn, matching the #N numbers in the
  status line, e.g. `/codey:explain 3`.

Running /codey:explain again with the same target returns a deeper explanation; just relay
that one too.
