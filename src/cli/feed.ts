import { existsSync, watchFile } from "node:fs";
import { join } from "node:path";
import { SessionStore } from "../store/session-store.js";
import { readWhys } from "../narration/history.js";
import { readPrompts } from "../capture/prompts.js";
import { readSessionMode } from "../statusline/active-mode.js";
import { feedChunks, advanceFeed, renderFeedHeader, type FeedCursor } from "../feed/render.js";

export function runFeed(sessionId: string): void {
  const store = new SessionStore(sessionId);
  const narrationPath = join(store.dir, "narration.jsonl");
  const promptsPath = join(store.dir, "prompts.jsonl");
  let cursor: FeedCursor = { printedChunks: new Set(), turnsHeadered: new Set() };

  const build = () => {
    const mode = readSessionMode(store.dir) ?? "simple";
    return feedChunks(store.readAll(), readPrompts(store.dir), readWhys(store.dir), mode);
  };
  const flush = () => {
    if (!existsSync(store.path)) return;
    const r = advanceFeed(build(), cursor);
    cursor = r.cursor;
    if (r.text) process.stdout.write(r.text + "\n");
  };

  process.stdout.write(renderFeedHeader() + "\n");
  flush();
  watchFile(store.path, { interval: 1000 }, flush);
  watchFile(narrationPath, { interval: 1000 }, flush);
  watchFile(promptsPath, { interval: 1000 }, flush);
}
