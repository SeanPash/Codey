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
  errorText: string | null;      // the actual error, shown inline when status is "fail"
  resolved: boolean;             // failed, but a later same-tool action in the chunk succeeded
}

export interface TokenBreakdown {
  workTotal: number;             // sum of output tokens (the spend people care about)
  workLines: ReceiptLine[];
  contextTotal: number;          // input + cache tokens, the "mostly cached, cheap" line
}

export interface TimelineChunk {
  id: string;
  name: string;
  narration: string;
  startTs: number;
  endTs: number;                 // exclusive upper bound (next chunk start, or open-ended)
  tokenTotal: number;            // workTotal + contextTotal (legacy combined field)
  workTotal: number;             // output tokens for this chunk, the headline number
  contextTotal: number;          // input + cache for this chunk
  warnings: Warning[];
  receipt: TokenBreakdown;
}

export interface SessionSnapshot {
  sessionId: string;
  sessionName: string;
  live: boolean;
  totalTokens: number;             // the TRUE session total counted once (work + context)
  workTotal: number;               // session work tokens, the headline
  contextTotal: number;            // session context tokens (input + cache)
  taskCount: number;
  priciestTaskName: string | null; // ranked by work tokens, not context
  chunks: TimelineChunk[];
  activeWarning: Warning | null;   // Plan 3: the live "stuck" warning, or null; drives the bar
}

// --- Live Split: compact multi-session view ---

export interface LiveSession {
  sessionId: string;
  name: string;
  workTotal: number;
  live: boolean;               // running within the live window
  lastPromptTs: number;        // ordering key for Live Split (only moves on a new prompt)
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
