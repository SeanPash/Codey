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
import { stripDashes } from "../util/text.js";

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

// The phase chip on line one, Title Case so it reads as a label not a shout.
function stageChip(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

// Pick the sentence for the current mode: simple is one line, deep and teach reach for the
// richer fields when they exist and fall back gracefully when they do not.
function pickSentence(caption: LiveCaption, mode: Mode): string {
  if (mode === "deep") return caption.deep ?? caption.simple;
  if (mode === "teach") return caption.teach ?? caption.deep ?? caption.simple;
  return caption.simple;
}

const DONE_SENTENCE = "Finished this prompt. Open the timeline for the full breakdown.";
const SEE_MORE = "/codey:timeline · /codey:costs";

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
    return { ...base, state: "thinking", stage: "Thinking", sentence: "Claude is thinking through your request.", warning: null, hint: null };
  }

  if (done) {
    // Keep the AI recap when there is one, since it says what the turn actually accomplished;
    // otherwise fall back to a clean generic line. Either way, point at the fuller views.
    const recap = snap.why && snap.why.trim() ? stripDashes(snap.why) : DONE_SENTENCE;
    return { ...base, state: "done", stage: "Done", sentence: recap, warning: null, hint: SEE_MORE };
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
  // In ask mode nothing is narrated automatically; when the budget is spent we stop too. In
  // both cases the caption falls back to its free deterministic wording.
  const ai = snap.mode === "ask" || paused ? null : scheduleWhy(whys, now) ?? snap.why;
  const caption = buildCaption(current, snap.mode, ai);
  const hint = snap.mode === "ask" ? "/codey:explain for the why" : paused;

  return {
    ...base,
    state: "live",
    stage: stageChip(caption.stage),
    sentence: pickSentence(caption, snap.mode),
    warning: snap.warning,
    hint,
  };
}
