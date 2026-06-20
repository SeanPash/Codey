import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
function file(dir) {
    return join(dir, "statusline.json");
}
export function writeStatus(dir, snap) {
    writeFileSync(file(dir), JSON.stringify(snap));
}
// Merge a partial update so capture and the narrator can each touch their own field.
export function patchStatus(dir, patch) {
    const current = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
    writeStatus(dir, { ...current, ...patch, updatedAt: Date.now() });
}
export function readStatus(dir) {
    const p = file(dir);
    if (!existsSync(p))
        return null;
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    }
    catch {
        return null;
    }
}
