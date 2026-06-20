import { pathToFileURL } from "node:url";
import { normalizeHookEvent } from "./normalize.js";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import { writeMetaIfAbsent } from "../store/session-meta.js";
import { patchStatus } from "../statusline/state.js";
import { actionFromEvent } from "../statusline/from-event.js";
export function handleHookInput(rawJson, root = defaultRoot()) {
    const text = rawJson.trim();
    if (!text)
        return;
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return; // never break Claude's tool flow on bad input
    }
    const event = normalizeHookEvent(raw);
    const store = new SessionStore(event.sessionId, root);
    store.append(event);
    const action = actionFromEvent(event);
    if (action)
        patchStatus(store.dir, { action });
    writeMetaIfAbsent({ sessionId: event.sessionId, transcriptPath: raw.transcript_path ?? null, cwd: raw.cwd ?? null }, root);
}
// Process entry: read all of stdin, then handle. Always exit 0.
function main() {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
        try {
            handleHookInput(raw);
        }
        catch { /* swallow */ }
        process.exit(0);
    });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
    main();
