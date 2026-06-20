import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
export function defaultRoot() {
    return join(homedir(), ".codey", "sessions");
}
export class SessionStore {
    file;
    constructor(sessionId, root = defaultRoot()) {
        const dir = join(root, sessionId);
        mkdirSync(dir, { recursive: true });
        this.file = join(dir, "events.jsonl");
    }
    append(event) {
        appendFileSync(this.file, JSON.stringify(event) + "\n");
    }
    readAll() {
        if (!existsSync(this.file))
            return [];
        return readFileSync(this.file, "utf8")
            .split("\n")
            .filter((l) => l.trim().length > 0)
            .map((l) => JSON.parse(l));
    }
    get path() {
        return this.file;
    }
    get dir() {
        return dirname(this.file);
    }
}
