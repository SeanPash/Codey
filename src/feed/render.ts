import type { Card } from "../statusline/schedule.js";
import type { WhyEntry } from "../narration/history.js";
import { pastTense, shortTarget } from "../statusline/labels.js";

// Small local palette so the feed reads like the status card without importing its internals.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BRAND = "\x1b[38;5;75m";
const GOLD = "\x1b[38;5;214m";
const LAV = "\x1b[38;5;147m";
const TEXT = "\x1b[38;5;253m";
const GREEN = "\x1b[38;5;114m";
const RULE = "\x1b[38;5;240m";

export interface FeedItem {
  seq: number;
  ts: number;
  tag: string;
  target: string;
  why: string | null;
}

export interface FeedCursor {
  lastSeq: number;
  whysShownFor: Set<number>;
  turnsHeadered: Set<number>;
  turnsSummarized: Set<number>;
}

// Attach to each card the last why produced before the next card began.
export function feedItems(cards: Card[], whys: WhyEntry[]): FeedItem[] {
  return cards.map((c, i) => {
    const next = cards[i + 1]?.ts ?? Infinity;
    const inWindow = whys.filter((w) => w.ts >= c.ts && w.ts < next);
    return {
      seq: c.seq,
      ts: c.ts,
      tag: c.action.tag,
      target: c.action.target,
      why: inWindow.length ? inWindow[inWindow.length - 1].why : null,
    };
  });
}

// Which turn an item belongs to: the count of prompt boundaries at or before its ts.
// Items before the first prompt are turn 0.
function turnOf(ts: number, prompts: number[]): number {
  let t = 0;
  for (const p of prompts) {
    if (ts >= p) t++;
    else break;
  }
  return t;
}

function turnHeader(turn: number, prompts: number[]): string {
  const ts = prompts[turn - 1];
  const when = ts ? new Date(ts).toTimeString().slice(0, 5) : "";
  const label = when ? `Turn ${turn} · ${when}` : `Turn ${turn}`;
  return `\n${BOLD}${BRAND}══ ${label} ══${RESET}`;
}

function cardBlock(it: FeedItem): string {
  const lines = [`${RULE}──────────────${RESET}`, `${BOLD}${GOLD}#${it.seq}${RESET} ${TEXT}${it.tag} ${it.target}${RESET}`];
  if (it.why) lines.push(whyLine(it.why));
  return lines.join("\n");
}

function whyLine(why: string): string {
  return `  ${LAV}└ why${RESET}  ${TEXT}${why}${RESET}`;
}

function summaryBlock(items: FeedItem[]): string {
  const lines = [`${DIM}── summary ──${RESET}`];
  const last = [...items].reverse().find((it) => it.why);
  if (last?.why) lines.push(`  ${TEXT}${last.why}${RESET}`);
  for (const it of items) lines.push(`  ${GREEN}✓${RESET} ${GOLD}#${it.seq}${RESET} ${TEXT}${pastTense(it.tag)} ${shortTarget(it.target)}${RESET}`);
  return lines.join("\n");
}

export function renderFeedHeader(): string {
  return `${BOLD}${BRAND}codey${RESET} ${DIM}· session feed${RESET}`;
}

// Incremental output for live append: new turn headers and cards, late whys for printed
// cards, and a summary for each turn that has just closed.
export function advanceFeed(items: FeedItem[], cursor: FeedCursor, prompts: number[]): { text: string; cursor: FeedCursor } {
  const parts: string[] = [];
  const whysShownFor = new Set(cursor.whysShownFor);
  const turnsHeadered = new Set(cursor.turnsHeadered);
  const turnsSummarized = new Set(cursor.turnsSummarized);
  let lastSeq = cursor.lastSeq;

  // Late whys for already-printed cards.
  for (const it of items) {
    if (it.seq <= cursor.lastSeq && it.why && !whysShownFor.has(it.seq)) {
      parts.push(whyLine(it.why));
      whysShownFor.add(it.seq);
    }
  }

  // New cards, each under its turn header.
  for (const it of items) {
    if (it.seq <= cursor.lastSeq) continue;
    const turn = turnOf(it.ts, prompts);
    if (!turnsHeadered.has(turn)) {
      parts.push(turnHeader(turn, prompts));
      turnsHeadered.add(turn);
    }
    parts.push(cardBlock(it));
    if (it.why) whysShownFor.add(it.seq);
    lastSeq = Math.max(lastSeq, it.seq);
  }

  // Summaries for turns that are now closed (a later turn exists) and not yet summarized.
  const maxTurn = items.reduce((m, it) => Math.max(m, turnOf(it.ts, prompts)), 0);
  for (let turn = 0; turn <= maxTurn; turn++) {
    if (turn >= maxTurn) continue; // the latest turn is still open
    if (turnsSummarized.has(turn)) continue;
    const turnItems = items.filter((it) => turnOf(it.ts, prompts) === turn);
    if (turnItems.length === 0) continue;
    parts.push(summaryBlock(turnItems));
    turnsSummarized.add(turn);
  }

  return { text: parts.join("\n"), cursor: { lastSeq, whysShownFor, turnsHeadered, turnsSummarized } };
}
