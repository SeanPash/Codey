import { existsSync, watchFile } from "node:fs";
import { join } from "node:path";
import { SessionStore } from "../store/session-store.js";
import { cardsFromEvents } from "../statusline/compose.js";
import { readWhys } from "../narration/history.js";
import { feedItems, advanceFeed, renderFeedHeader, type FeedCursor } from "../feed/render.js";

export function runFeed(sessionId: string): void {
  const store = new SessionStore(sessionId);
  const narrationPath = join(store.dir, "narration.jsonl");
  let cursor: FeedCursor = { lastSeq: 0, whysShownFor: new Set() };

  const build = () => feedItems(cardsFromEvents(store.readAll()), readWhys(store.dir));
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
}
