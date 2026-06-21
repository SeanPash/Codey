import type { ToolEvent } from "../types.js";
import { actionLabel, rawTarget } from "./labels.js";
import { schedule, type Card } from "./schedule.js";
import type { StatusSnapshot } from "./state.js";
import type { CardView, StatusView } from "./view.js";

// A run of the same kind of action that lands faster than this is treated as one
// burst. It keeps Codey from falling minutes behind when Claude reads ten files in
// a second, while still giving deliberate, spaced-out steps their own card.
const GROUP_WINDOW_MS = 2500;

// Strip the friendly prefix so a group can list bare names: "the file a.ts" -> "a.ts".
function shortName(target: string): string {
  return target.replace(/^the (file|folder) /, "");
}

// The plural noun a group is counted in, chosen from the verb.
function groupNoun(tag: string): string {
  if (/read|edit|writ|remov|creat|mov|copy/.test(tag)) return "files";
  if (/search|fetch/.test(tag)) return "searches";
  return "steps";
}

function groupedTarget(tag: string, names: string[]): string {
  const head = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? `, +${names.length - 2}` : "";
  return `${names.length} ${groupNoun(tag)} (${head}${extra})`;
}

interface Building extends Card {
  names: string[];
  lastTs: number;
}

export function cardsFromEvents(events: ToolEvent[]): Card[] {
  const built: Building[] = [];
  let seq = 0;
  for (const e of events) {
    if (e.phase !== "pre") continue;
    seq++;
    const action = actionLabel(e.tool, e.input);
    const last = built[built.length - 1];
    const close = last && e.timestamp - last.lastTs <= GROUP_WINDOW_MS;
    if (last && close && last.action.tag === action.tag) {
      // Fold this event into the running burst and re-phrase the target as a count.
      last.names.push(shortName(action.target));
      last.lastTs = e.timestamp;
      last.endSeq = seq;
      last.ts = e.timestamp;
      last.action = { tag: action.tag, target: groupedTarget(action.tag, last.names) };
    } else {
      built.push({
        seq,
        action,
        raw: rawTarget(e.tool, e.input),
        ts: e.timestamp,
        names: [shortName(action.target)],
        lastTs: e.timestamp,
      });
    }
  }
  return built.map(({ names, lastTs, ...card }) => card);
}

const toView = (c: Card): CardView => ({
  seq: c.seq,
  endSeq: c.endSeq,
  tag: c.action.tag,
  target: c.action.target,
  raw: c.raw,
});

export function composeView(
  events: ToolEvent[],
  snap: StatusSnapshot,
  now: number,
  dwellMs: number,
): StatusView {
  const { current, prev, isLatest } = schedule(cardsFromEvents(events), now, dwellMs);
  const newestTs = events.reduce((m, e) => Math.max(m, e.timestamp), Number.NEGATIVE_INFINITY);
  // Claude is between turns: a prompt arrived after the last tool finished and we are
  // caught up, so nothing new is running yet.
  const thinking = snap.promptAt != null && snap.promptAt > newestTs && isLatest;
  return {
    mode: snap.mode,
    current: current ? toView(current) : null,
    prev: prev.map(toView),
    why: isLatest && !thinking ? snap.why : null,
    warning: isLatest ? snap.warning : null,
    thinking,
  };
}
