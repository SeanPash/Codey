import type { Card } from "../statusline/schedule.js";
import type { WhyEntry } from "../narration/history.js";

// Small local palette so the feed reads like the status card without importing its internals.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BRAND = "\x1b[38;5;75m";
const GOLD = "\x1b[38;5;214m";
const LAV = "\x1b[38;5;147m";
const TEXT = "\x1b[38;5;253m";

export interface FeedItem {
  seq: number;
  tag: string;
  target: string;
  why: string | null;
}

export interface FeedCursor {
  lastSeq: number;
  whysShownFor: Set<number>;
}

// Attach to each card the last why produced before the next card began.
export function feedItems(cards: Card[], whys: WhyEntry[]): FeedItem[] {
  return cards.map((c, i) => {
    const next = cards[i + 1]?.ts ?? Infinity;
    const inWindow = whys.filter((w) => w.ts >= c.ts && w.ts < next);
    return {
      seq: c.seq,
      tag: c.action.tag,
      target: c.action.target,
      why: inWindow.length ? inWindow[inWindow.length - 1].why : null,
    };
  });
}

function cardBlock(it: FeedItem): string {
  const lines = [`${BRAND}╭${RESET} ${BOLD}${GOLD}#${it.seq}${RESET} ${TEXT}${it.tag} ${it.target}${RESET}`];
  if (it.why) lines.push(whyLine(it.why));
  lines.push(`${BRAND}╰${RESET}`);
  return lines.join("\n");
}

function whyLine(why: string): string {
  return `${BRAND}│${RESET} ${LAV}why${RESET}  ${TEXT}${why}${RESET}`;
}

export function renderFeedHeader(): string {
  return `${BOLD}${BRAND}codey${RESET} ${DIM}· session feed${RESET}`;
}

export function renderFeed(items: FeedItem[]): string {
  return [renderFeedHeader(), ...items.map(cardBlock)].join("\n");
}

// Incremental output for live append: late whys for printed cards first, then new cards.
export function advanceFeed(items: FeedItem[], cursor: FeedCursor): { text: string; cursor: FeedCursor } {
  const parts: string[] = [];
  const whysShownFor = new Set(cursor.whysShownFor);
  for (const it of items) {
    if (it.seq <= cursor.lastSeq && it.why && !whysShownFor.has(it.seq)) {
      parts.push(whyLine(it.why));
      whysShownFor.add(it.seq);
    }
  }
  let lastSeq = cursor.lastSeq;
  for (const it of items) {
    if (it.seq > cursor.lastSeq) {
      parts.push(cardBlock(it));
      if (it.why) whysShownFor.add(it.seq);
      lastSeq = Math.max(lastSeq, it.seq);
    }
  }
  return { text: parts.join("\n"), cursor: { lastSeq, whysShownFor } };
}
