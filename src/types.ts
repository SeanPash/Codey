export type ToolPhase = "pre" | "post";
export type Mode = "simple" | "deep";

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
  tokenTotal: number;            // workTotal + contextTotal
  warnings: Warning[];
  receipt: TokenBreakdown;
}

export interface SessionSnapshot {
  sessionId: string;
  sessionName: string;
  live: boolean;
  totalTokens: number;
  taskCount: number;
  priciestTaskName: string | null;
  chunks: TimelineChunk[];
}

// --- Plan 3: loop-breaker / intervention ---

export type InterventionAction = "nudge" | "different" | "stop";

export interface InterventionFile {
  action: InterventionAction;
  tool: string;          // the offending tool from the active warning; the hook matches on this
  count: number;         // repetitions (loop/repeat_error) or seconds (hang), interpolated into the reason
  createdAt: number;     // epoch ms, used for the TTL
}
