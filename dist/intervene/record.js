import { SessionStore, defaultRoot } from "../store/session-store.js";
import { resolveActiveWarning } from "./active-warning.js";
import { writeInterventionFile } from "./file-io.js";
const ACTIONS = ["nudge", "different", "stop"];
function isAction(a) {
    return ACTIONS.includes(a);
}
// Writer side: recompute the current active warning (fresher than the ~2s-old snapshot) and write a
// one-shot intervene.json from it. Returns false (and writes nothing) for a bad action or no warning.
export function recordIntervention(sessionId, action, root = defaultRoot()) {
    if (!isAction(action))
        return false;
    const events = new SessionStore(sessionId, root).readAll();
    const warning = resolveActiveWarning(events, Date.now());
    if (!warning)
        return false;
    writeInterventionFile(sessionId, { action, tool: warning.tool, count: warning.count, createdAt: Date.now() }, root);
    return true;
}
