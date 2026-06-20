import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
export function interventionPath(sessionId, root = defaultRoot()) {
    return join(root, sessionId, "intervene.json");
}
// Latest click wins: overwrite any existing pending file.
export function writeInterventionFile(sessionId, file, root = defaultRoot()) {
    mkdirSync(join(root, sessionId), { recursive: true });
    writeFileSync(interventionPath(sessionId, root), JSON.stringify(file));
}
export function readInterventionFile(sessionId, root = defaultRoot()) {
    const file = interventionPath(sessionId, root);
    if (!existsSync(file))
        return null;
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
export function deleteInterventionFile(sessionId, root = defaultRoot()) {
    try {
        rmSync(interventionPath(sessionId, root), { force: true });
    }
    catch {
        // already gone, or unreadable; nothing to do
    }
}
