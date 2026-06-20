import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "./session-store.js";
function metaPath(sessionId, root) {
    return join(root, sessionId, "meta.json");
}
// Write once per session. The first hook event wins; later events leave it untouched.
export function writeMetaIfAbsent(meta, root = defaultRoot()) {
    const file = metaPath(meta.sessionId, root);
    if (existsSync(file))
        return;
    mkdirSync(join(root, meta.sessionId), { recursive: true });
    writeFileSync(file, JSON.stringify(meta, null, 2));
}
export function readMeta(sessionId, root = defaultRoot()) {
    const file = metaPath(sessionId, root);
    if (!existsSync(file))
        return null;
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
