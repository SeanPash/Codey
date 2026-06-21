import type { ToolEvent } from "../types.js";
import { actionLabel, rawTarget } from "./labels.js";
import { schedule, type Card } from "./schedule.js";
import type { StatusSnapshot } from "./state.js";
import type { CardView, StatusView } from "./view.js";

export function cardsFromEvents(events: ToolEvent[]): Card[] {
  const cards: Card[] = [];
  let seq = 0;
  for (const e of events) {
    if (e.phase !== "pre") continue;
    seq++;
    cards.push({ seq, action: actionLabel(e.tool, e.input), raw: rawTarget(e.tool, e.input), ts: e.timestamp });
  }
  return cards;
}

const toView = (c: Card): CardView => ({ seq: c.seq, tag: c.action.tag, target: c.action.target, raw: c.raw });

export function composeView(events: ToolEvent[], snap: StatusSnapshot, now: number, dwellMs: number): StatusView {
  const { current, prev, isLatest } = schedule(cardsFromEvents(events), now, dwellMs);
  return {
    mode: snap.mode,
    current: current ? toView(current) : null,
    prev: prev.map(toView),
    why: isLatest ? snap.why : null,
    warning: isLatest ? snap.warning : null,
  };
}
