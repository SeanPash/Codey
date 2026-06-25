import type { ToolEvent, Mode } from "../types.js";
import { actionLabel, rawTarget } from "./labels.js";
import { type Card } from "./schedule.js";
import { scheduleWhy } from "./read-time.js";
import { formatDuration } from "../timeline/duration.js";
import type { StatusSnapshot } from "./state.js";
import type { StatusView } from "./view.js";
import type { WhyEntry } from "../narration/history.js";
import { budgetLeftLabel, budgetPausedMessage, type Budget } from "../budget/budget.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption, type LiveCaption } from "../caption/caption.js";
import { buildRecap } from "../caption/recap.js";

// A run of the same kind of action that lands faster than this is treated as one
// burst. It keeps the /explain card numbering from fragmenting when Claude reads ten
// files in a second, while still giving deliberate, spaced-out steps their own card.
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

// Pick the sentence for the current mode: simple is one line, deep and teach reach for the
// richer fields when they exist and fall back gracefully when they do not.
function pickSentence(caption: LiveCaption, mode: Mode): string {
  if (mode === "deep") return caption.deep ?? caption.simple;
  if (mode === "teach") return caption.teach ?? caption.deep ?? caption.simple;
  return caption.simple;
}

// How much of the HUD's second line each mode gets. Simple is one short sentence; deep and
// teach may carry a second. The char caps keep a long AI explanation from running off the
// line: when even the first sentence overflows, we drop to the shorter deterministic caption
// rather than truncate mid-thought. The teaching depth lives in the browser timeline instead.
const SENTENCE_BUDGET: Record<Mode, { sentences: number; chars: number }> = {
  simple: { sentences: 1, chars: 120 },
  deep: { sentences: 2, chars: 200 },
  teach: { sentences: 2, chars: 200 },
};

// Split on sentence ends, keeping the punctuation, so each piece is a whole thought.
function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Keep whole sentences from `text` up to the mode's budget. Returns "" when not even the first
// sentence fits within the char cap, so the caller can fall back to a shorter complete line.
function fitWithin(text: string, sentences: number, chars: number): string {
  const kept: string[] = [];
  for (const s of splitSentences(text)) {
    if (kept.length >= sentences) break;
    const joined = [...kept, s].join(" ");
    if (joined.length > chars) break;
    kept.push(s);
  }
  return kept.join(" ");
}

// The HUD's second line: prefer the AI-grounded sentence, but only as whole sentences within
// the mode's budget. When it is too long to show complete, use the short deterministic caption
// instead. Never returns a line cut off mid-thought, so the renderer never has to add an ellipsis.
function fitSentence(primary: string, fallback: string, mode: Mode): string {
  const { sentences, chars } = SENTENCE_BUDGET[mode];
  const fit = fitWithin(primary, sentences, chars);
  if (fit) return fit;
  const fb = fitWithin(fallback, sentences, chars);
  return fb || fallback;
}

// The closing footer, shown at the bottom of every finished prompt so there is always a clear
// "this turn is done, here is where to see more" line, whether or not a recap was generated.
const DONE_FOOTER = "Run /codey:timeline for the full breakdown.";

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
  // newer prompt is pending. Then we recap instead of pointing at a live phase.
  const done = !thinking && snap.doneAt != null && snap.doneAt >= newestTs;

  // Time on the current turn: ticks while Claude works, freezes at the turn's total length
  // once it finishes. Null before any prompt is stamped.
  let elapsed: string | null = null;
  if (snap.promptAt != null && snap.promptAt > 0) {
    const endTs = done && snap.doneAt != null ? snap.doneAt : now;
    elapsed = formatDuration(Math.max(0, endTs - snap.promptAt));
  }

  const base = { mode: snap.mode, elapsed, budgetLeft };

  if (thinking) {
    return { ...base, state: "thinking", stage: "Thinking", sentence: "Claude is thinking about your request.", warning: null, hint: null };
  }

  if (done) {
    // The close is recapped from the turn's own events, not Claude's chat reply, so it stays
    // honest: "Updated" only when an edit ran, "verified" only when a test or build ran. The
    // footer always sits beneath it, pointing at the fuller browser breakdown.
    const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
    const recap = buildRecap(events.filter((e) => e.timestamp >= turnStart));
    return { ...base, state: "done", stage: "Done", sentence: recap.sentence, warning: null, hint: DONE_FOOTER };
  }

  // The live phase is scoped to the current turn so it resets cleanly on each new prompt.
  // Before any prompt is stamped, the whole session counts as one turn.
  const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
  const chunks = chunkEvents(events.filter((e) => e.timestamp >= turnStart));

  if (chunks.length === 0) {
    return { ...base, state: "idle", stage: "Idle", sentence: "Waiting for Claude.", warning: snap.warning, hint: null };
  }

  // The current phase is simply the latest chunk: it stays put until the stage changes, so the
  // line holds a meaningful caption instead of flickering once per tool call.
  const current = chunks[chunks.length - 1];
  // When the budget is spent we stop narrating and the caption falls back to its free
  // deterministic wording. The why history is scoped to the current turn so a leftover
  // explanation from the previous prompt never shows under this turn's stage: the
  // explanation always matches the work on screen.
  const turnWhys = whys.filter((w) => w.ts >= turnStart);
  const ai = paused ? null : scheduleWhy(turnWhys, now) ?? snap.why;
  const caption = buildCaption(current, snap.mode, ai);
  // The deterministic caption is the fallback when the AI sentence is too long to show whole,
  // so the line always ends on a complete thought.
  const plain = ai ? buildCaption(current, snap.mode, null) : caption;
  const sentence = fitSentence(pickSentence(caption, snap.mode), pickSentence(plain, snap.mode), snap.mode);
  const hint = paused;

  return {
    ...base,
    // The line-one chip leads with the purpose ("Adding math.js"), not the bare stage, so the
    // HUD says what Claude is working on at a glance.
    state: "live",
    stage: caption.title,
    sentence,
    warning: snap.warning,
    hint,
  };
}
