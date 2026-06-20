import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { ToolEvent } from "../types.js";

export function defaultRoot(): string {
  return join(homedir(), ".codey", "sessions");
}

export class SessionStore {
  private file: string;

  constructor(sessionId: string, root: string = defaultRoot()) {
    const dir = join(root, sessionId);
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "events.jsonl");
  }

  append(event: ToolEvent): void {
    appendFileSync(this.file, JSON.stringify(event) + "\n");
  }

  readAll(): ToolEvent[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as ToolEvent);
  }

  get path(): string {
    return this.file;
  }

  get dir(): string {
    return dirname(this.file);
  }
}
