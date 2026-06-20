---
description: Turn Codey narration on or off and pick its depth
argument-hint: simple | deep | teach | off
---

The user wants to control Codey narration. The argument is: $ARGUMENTS

Run the matching command from the Codey plugin's built CLI (path is `${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js`):

- `simple`, `deep`, or `teach`: run `node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" on --mode <arg>`
- `off`: run `node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" off`
- anything else or empty: tell the user the valid options (simple, deep, teach, off).

After running it, tell the user in one line what changed (for example, "Codey narration is on in deep mode; watch the status line"). If narration was just turned on, remind them the status line updates as Claude works, and that they can open the bigger view in a separate terminal with `node "${CLAUDE_PLUGIN_ROOT}/dist/cli/index.js" watch`.
