import type { Stage } from "./stage.js";

// Domain-aware purpose inference. The generic caption layer names files and stages well, but
// some work is a recognizable investigation with a real hypothesis behind it: "is the timeline
// showing stale code", "did capture record this prompt", "what is the live narration printing".
// When the evidence points at one of those, we can say what Claude is actually trying to confirm
// instead of "reading index.html". Each recognizer only fires on strong, specific signals and
// returns null otherwise, so ordinary work falls through to the generic caption untouched.

export interface PurposeEvidence {
  stage: Stage;
  tool: string;
  targets: string[];   // file basenames and shell subjects this run touched
  searches: string[];  // literal search patterns looked for
  symbols: string[];   // names a change introduced
  command: string | null; // the raw shell command, when this run was one
  prompt?: string | null; // the user's request, for extra grounding
}

// A fully-differentiated caption: simple is the one concrete sentence, deep adds the relationship
// or what the step rules out, teach adds the concept. Each is strictly richer than the last.
export interface Purpose {
  title: string;
  simple: string;
  deep: string;
  teach: string;
}

// Everything readable about a run, pooled into one lowercased haystack so a recognizer can test
// signals across the file names, search terms, command, symbols, and prompt at once.
function haystack(ev: PurposeEvidence): string {
  return [...ev.targets, ...ev.searches, ...ev.symbols, ev.command ?? "", ev.prompt ?? ""]
    .join(" ")
    .toLowerCase();
}

function any(text: string, res: RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

// The timeline page rendered in the browser, versus the source/built file it is served from.
const TIMELINE_PAGE = [/index\.html/, /timeline page/, /served page/, /\blocalhost\b/, /:\d{4}\b/];
// The token-breakdown labels that go missing when markup or cached code drifts.
const TOKEN_LABELS = [/token\s*breakdown/, /tokenbreakdown/, /breakdown row/, /token label/, /\btoken[s]?\b.*\blabel/, /\blabel[s]?\b.*\btoken/];
// Evidence that the run actually held the served page and the source side by side: a fetch of the
// running server, a diff, a named cache copy, or references to both the dist and src trees. Only
// then is "comparing the served page with the source" an honest thing to say.
const COMPARISON = [/\bcurl\b/, /\blocalhost\b/, /:\d{4}\b/, /\bdiff\b/, /cache copy/, /\bserved\b/];

function hasComparison(h: string): boolean {
  if (any(h, COMPARISON)) return true;
  return /\bdist\b/.test(h) && /\bsrc\b/.test(h);
}

function timelinePagePurpose(ev: PurposeEvidence): Purpose | null {
  const h = haystack(ev);
  if (!any(h, TIMELINE_PAGE) || !any(h, TOKEN_LABELS)) return null;
  // Without two sides to weigh, this is a plain look at the page, not a comparison. Let the
  // generic search caption (which names the exact terms) handle that case instead of overclaiming.
  if (!hasComparison(h)) return null;
  return {
    title: "Checking the live timeline",
    simple:
      "Claude is comparing the served timeline page with the source file to find why the token labels are missing.",
    deep:
      "Claude is comparing the served timeline page with the source file to find why the token labels are missing. This separates a real markup bug from stale browser code or a build that was never refreshed.",
    teach:
      "Claude is comparing the served timeline page with the source file to find why the token labels are missing. This separates a real markup bug from stale browser code or an old build. A browser can keep old code loaded even after the server is fixed, so a page can look broken while the source is already correct.",
  };
}

// The on-disk session record Codey writes: one JSONL event per tool call, plus the narration log.
const SESSION_STORE = [
  /\.codey/,
  /sessions[\\/]/,
  /events\.jsonl/,
  /\.jsonl\b/,
  /narrator[-_]?log/,
  /session storage/,
  /session store/,
];

function sessionStoragePurpose(ev: PurposeEvidence): Purpose | null {
  const h = haystack(ev);
  if (!any(h, SESSION_STORE)) return null;
  return {
    title: "Checking session storage",
    simple:
      "Claude is checking the local session storage, the JSONL file where Codey records each tool call, to see whether this prompt's events were captured.",
    deep:
      "Claude is reading the session's events and narration log to confirm whether the data is being written. A missing prompt would point at capture, a present one at rendering or live polling.",
    teach:
      "Claude is reading the session's events and narration log to confirm whether the data is being written. A missing prompt would point at capture, a present one at rendering. Codey stores each session as a JSONL file, one event per line, which is the shared record the status line and timeline both read from.",
  };
}

// Running Codey's own CLI to watch what it prints, as opposed to just invoking a script.
const NARRATION_OUTPUT = [
  /index\.js\b[^\n]*\b(feed|narrate|watch|timeline)\b/,
  /\b(feed|narrate|watch)\b[^\n]*index\.js/,
  /codey\s+(feed|narrate|watch)/,
];

function narrationOutputPurpose(ev: PurposeEvidence): Purpose | null {
  const cmd = (ev.command ?? "").toLowerCase();
  if (!any(cmd, NARRATION_OUTPUT)) return null;
  return {
    title: "Checking live narration",
    simple:
      "Claude is running Codey's feed to read the live narration output and see what the watcher actually prints.",
    deep:
      "Claude is running Codey's feed against the current session to read the narration it produces, confirming whether the captions update as new tool calls arrive.",
    teach:
      "Claude is running Codey's feed against the current session to read the narration it produces, confirming whether the captions update as new tool calls arrive. The feed replays the same captions the status line shows, so running it is how you see the narration without watching the status bar live.",
  };
}

const RECOGNIZERS = [timelinePagePurpose, sessionStoragePurpose, narrationOutputPurpose];

// The first recognizer that fires, or null when no domain pattern is a strong match.
export function inferPurpose(ev: PurposeEvidence): Purpose | null {
  for (const r of RECOGNIZERS) {
    const p = r(ev);
    if (p) return p;
  }
  return null;
}
