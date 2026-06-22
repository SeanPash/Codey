export type ToolPhase = "pre" | "post";
export type Mode = "simple" | "deep" | "teach" | "ask";

export interface ToolEvent {
  id: string;          // unique per emitted event
  phase: ToolPhase;
  tool: string;        // e.g. "mcp__unity__execute_menu_item" or "Read"
  server: string | null; // "unity" for mcp__unity__*, else null
  input: unknown;      // present on "pre"
  inputHash: string;   // stable hash of tool + input (for loop detection)
  isError: boolean;    // meaningful on "post"
  errorText: string | null;
  timestamp: number;   // ms since epoch
  sessionId: string;
  toolUseId?: string | null; // Claude's tool_use id, for exact pre/post and transcript pairing
}

export interface SessionMeta {
  sessionId: string;
  transcriptPath: string | null;
  cwd: string | null;
}

export type WarningKind = "loop" | "hang" | "repeat_error";

export interface Warning {
  kind: WarningKind;
  tool: string;
  message: string;
  count: number;       // repetitions (loop/repeat_error) or seconds (hang)
  timestamp: number;
}

// --- Plan 2: browser timeline view model ---

export interface ReceiptLine {
  label: string;                 // plain-English: "Writing PlayerController.cs"
  tool: string;                  // "Write" | "Bash" | "thinking" | ...
  tokens: number;                // output tokens attributed to this action
  status: "ok" | "fail" | "none"; // "none" = a non-tool turn (e.g. thinking)
  errorText: string | null;      // the actual error, shown only in the expanded row
  resolved: boolean;             // failed, but a later same-tool action in the chunk succeeded
  raw: string | null;            // full command or file path, revealed when the row expands
  why: string | null;            // the owning task's narration, reused (no extra tokens)
  failSummary: string | null;    // plain-English failure sentence shown inline on a fail
  ts: number;                    // when this action happened (ms since epoch)
}

export interface TokenBreakdown {
  workTotal: number;             // sum of output tokens (the spend people care about)
  workLines: ReceiptLine[];
  contextTotal: number;          // input + cache tokens, the "mostly cached, cheap" line
}

export interface TimelineChunk {
  id: string;
  name: string;
  narration: string;             // the cheap "what" sentence, shown collapsed (near-free)
  startTs: number;
  endTs: number;                 // exclusive upper bound (next chunk start, or open-ended)
  tokenTotal: number;            // workTotal + contextTotal (legacy combined field)
  workTotal: number;             // output tokens for this chunk, the headline number
  contextTotal: number;          // input + cache for this chunk
  warnings: Warning[];
  receipt: TokenBreakdown;
  explanation: string | null;    // generated why/how at the seed depth, or null until asked for
}

// One user prompt and everything it set off: its tasks, cost, and how long it ran. A
// session is a stack of these, newest interaction building on the last.
export interface PromptGroup {
  id: string;                    // "p0", "p1", ...
  prompt: string;                // the user's words (clamped), or a fallback label
  startTs: number;
  endTs: number;                 // next prompt's start, or the session end (open while live)
  durationMs: number | null;     // null while this is the live/active group (browser ticks it)
  workTotal: number;
  contextTotal: number;
  tokenTotal: number;
  taskCount: number;
  chunks: TimelineChunk[];
  live: boolean;                 // the active group of a live session
  summary: string | null;        // generated recap of what this prompt accomplished, or null
}

export interface SessionSnapshot {
  sessionId: string;
  sessionName: string;
  project: string | null;          // cwd basename, an at-a-glance terminal tag
  color: string;                   // stable color from the session id, for recognition
  live: boolean;
  startedAt: number;               // first activity (ms epoch), for the total session timer
  lastActivityAt: number;          // latest activity (ms epoch)
  totalTokens: number;             // the TRUE session total counted once (work + context)
  workTotal: number;               // session work tokens, the headline
  contextTotal: number;            // session context tokens (input + cache)
  taskCount: number;
  priciestTaskName: string | null; // ranked by work tokens, not context
  groups: PromptGroup[];           // per-prompt grouping, the Single view's structure
  chunks: TimelineChunk[];         // flat task list, still used by the Active Terminals view
  activeWarning: Warning | null;   // Plan 3: the live "stuck" warning, or null; drives the bar
  seedDepth: "simple" | "deep" | "teach"; // depth to open the timeline at (from the session mode)
  genAuto: boolean;                // true when the session mode wants summaries to auto-generate
  budgetLeft: string | null;       // a "12k left" / "budget reached" cue, or null when uncapped
}

// --- Live Split: compact multi-session view ---

export interface LiveSession {
  sessionId: string;
  name: string;
  project: string | null;      // cwd basename, an at-a-glance terminal tag
  color: string;               // stable color from the session id, for recognition
  workTotal: number;
  running: boolean;            // mid-tool or active within the running window (pulsing)
  open: boolean;               // recently used, terminal likely still open
  lastPromptTs: number;        // ordering key (only moves on a new prompt)
  chunks: TimelineChunk[];     // compact timeline, rendered small
  runningTool: string | null;  // tool of the open pre-event, or null when idle
}

export interface LiveSnapshot {
  sessions: LiveSession[];     // already ordered: most recent prompt first
  liveCount: number;
}

// --- Plan 3: loop-breaker / intervention ---

export type InterventionAction = "nudge" | "different" | "stop";

export interface InterventionFile {
  action: InterventionAction;
  tool: string;          // the offending tool from the active warning; the hook matches on this
  count: number;         // repetitions (loop/repeat_error) or seconds (hang), interpolated into the reason
  createdAt: number;     // epoch ms, used for the TTL
}
