import type { ToolEvent } from "../types.js";
import { actionLabel, rawTarget } from "./labels.js";
import { schedule, type Card } from "./schedule.js";
import { readMs, scheduleWhy } from "./read-time.js";
import type { StatusSnapshot } from "./state.js";
import type { CardView, StatusView, SummaryView } from "./view.js";
import type { WhyEntry } from "../narration/history.js";
import { budgetLeftLabel, budgetPausedMessage, type Budget } from "../budget/budget.js";

// How many finished steps the summary checklist shows. Enough to recap the turn
// without growing the box back into the wall of text we are trying to avoid.
const SUMMARY_ITEMS = 3;

// A run of the same kind of action that lands faster than this is treated as one
// burst. It keeps Codey from falling minutes behind when Claude reads ten files in
// a second, while still giving deliberate, spaced-out steps their own card.
const GROUP_WINDOW_MS = 2500;

// Extra dwell per action folded into a burst, so a card that stands for ten reads
// lingers longer than a single read instead of flashing past in one read-time.
const GROUP_STEP_MS = 600;

// In ask mode nothing is narrated automatically, so the why slot points the user at the
// pull command instead of sitting empty.
const ASK_HINT = "Run /codey:explain for the why";

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

// A card dwells for the time it takes to read its own line, plus a step for each extra
// action it groups, so big bursts get proportionally more time on screen.
function cardDwell(c: Card): number {
  const base = readMs(`${c.action.tag} ${c.action.target}`);
  const count = c.endSeq && c.endSeq > c.seq ? c.endSeq - c.seq + 1 : 1;
  return base + (count - 1) * GROUP_STEP_MS;
}

export function composeView(
  events: ToolEvent[],
  snap: StatusSnapshot,
  now: number,
  whys: WhyEntry[] = [],
  budget: Budget | null = null,
): StatusView {
  const budgetLeft = budgetLeftLabel(budget);
  const paused = budgetPausedMessage(budget);
  const newestTs = events.reduce((m, e) => Math.max(m, e.timestamp), Number.NEGATIVE_INFINITY);
  // Claude is between turns: a prompt arrived after the last tool finished, so nothing
  // new is running yet.
  const thinking = snap.promptAt != null && snap.promptAt > newestTs;
  // Claude has finished: the stop hook stamped a doneAt at or after the last tool and no
  // newer prompt is pending. Then we recap instead of pointing at a live task.
  const done = !thinking && snap.doneAt != null && snap.doneAt >= newestTs;

  // The live line is scoped to the current turn so the numbers restart at #1 each prompt;
  // a status line that climbs to #87 is noise. The full cross-session history lives in the
  // feed. Before any prompt is stamped, the whole session counts as one turn.
  const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
  const cards = cardsFromEvents(events.filter((e) => e.timestamp >= turnStart));

  // Thinking and done are turn-boundary states, so they preempt the reveal animation: the
  // line snaps straight to them instead of waiting for the pointer to crawl through the
  // steps it already missed. That is what kept the summary and the thinking line lagging.
  if (thinking || done) {
    const summary: SummaryView | null = done
      ? { sentence: snap.why, items: cards.slice(-SUMMARY_ITEMS).map(toView) }
      : null;
    return { mode: snap.mode, current: null, prev: [], why: null, warning: null, thinking, summary, budgetLeft };
  }

  const { current, prev, isLatest } = schedule(cards, now, cardDwell);
  const heldWhy = scheduleWhy(whys, now) ?? snap.why;
  return {
    mode: snap.mode,
    current: current ? toView(current) : null,
    prev: prev.map(toView),
    // why precedence: the ask hint, then a budget-paused notice, then the real why.
    why: snap.mode === "ask" ? ASK_HINT : (paused ?? (isLatest ? heldWhy : null)),
    warning: isLatest ? snap.warning : null,
    thinking: false,
    summary: null,
    budgetLeft,
  };
}
