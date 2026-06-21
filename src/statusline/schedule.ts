import type { ActionLabel } from "./labels.js";

export interface Card {
  seq: number;
  endSeq?: number; // set when this card stands in for a grouped burst, e.g. #3-7
  action: ActionLabel;
  raw: string | null;
  ts: number;
}

export interface Scheduled {
  current: Card | null;
  prev: Card[]; // up to two cards before current, oldest first
  isLatest: boolean;
}

// Reveal cards no faster than each one's own dwell so it is readable, and never skip
// one: if Claude raced ahead, the pointer catches up in order.
export function schedule(cards: Card[], now: number, dwellFor: (card: Card) => number): Scheduled {
  if (cards.length === 0) return { current: null, prev: [], isLatest: true };
  let shownAt = cards[0].ts;
  let displayed = 0;
  for (let i = 1; i < cards.length; i++) {
    const earliest = Math.max(cards[i].ts, shownAt + dwellFor(cards[displayed]));
    if (earliest > now) break;
    shownAt = earliest;
    displayed = i;
  }
  return {
    current: cards[displayed],
    prev: cards.slice(Math.max(0, displayed - 2), displayed),
    isLatest: displayed === cards.length - 1,
  };
}
