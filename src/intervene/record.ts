import { SessionStore, defaultRoot } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { resolveActiveWarning } from "./active-warning.js";
import { writeInterventionFile } from "./file-io.js";
import type { InterventionAction } from "../types.js";

const ACTIONS: InterventionAction[] = ["nudge", "different", "stop"];

function isAction(a: string): a is InterventionAction {
  return (ACTIONS as string[]).includes(a);
}

// Writer side: recompute the current active warning (fresher than the ~2s-old snapshot) and write a
// one-shot intervene.json from it. Returns false (and writes nothing) for a bad action or no warning.
export function recordIntervention(sessionId: string, action: string, root: string = defaultRoot()): boolean {
  if (!isAction(action)) return false;
  const events = new SessionStore(sessionId, root).readAll();
  // Reconcile errors from the transcript first, exactly like the snapshot the user clicked on:
  // an errored tool fires no PostToolUse, so a repeat_error warning only exists after this step.
  // Without it, clicking on a repeat_error warning would resolve to nothing and silently no-op.
  const turns = readTranscriptTurns(readMeta(sessionId, root)?.transcriptPath ?? null);
  const warning = resolveActiveWarning(reconcileErrors(events, turns), Date.now());
  if (!warning) return false;
  writeInterventionFile(sessionId,
    { action, kind: warning.kind, tool: warning.tool, count: warning.count, createdAt: Date.now() }, root);
  return true;
}
