import type { SessionSnapshot, ReceiptLine } from "../types.js";
import type { ExplainDepth } from "./explain-prompt.js";
import { buildTaskExplainPrompt, buildActionExplainPrompt } from "./explain-prompt.js";
import { buildSummaryPrompt, type SummaryTask } from "./summary-prompt.js";
import { readExplanation, writeExplanation, type ExplainScope } from "./explain-cache.js";
import { hashContent } from "../util/hash.js";
import { readBudget, addSpend, budgetAllows } from "../budget/budget.js";
import { stripDashes } from "../util/text.js";
import { isVacuousExplanation } from "../caption/banned.js";

export interface ExplainRequest {
  sessionId: string;
  scope: ExplainScope;
  id: string;            // chunk id, group id, or "chunkId#lineIndex" for an action
  depth: ExplainDepth;
}

export interface ExplainResult {
  text: string | null;
  cached: boolean;
  paused: boolean;       // budget reached, nothing generated
}

// Generation through the user's own metered headless Claude. Injected so the server wires
// the real call and tests never spawn a process.
export type Narrate = (prompt: string) => Promise<{ text: string; tokens: number } | null>;

export interface ExplainDeps {
  narrate: Narrate;
  root: string;          // sessions root, for the explanation cache
  sessionDir: string;    // this session's dir, for the budget
}

// Map a session's narration mode to the timeline's opening depth and whether it should
// auto-generate summaries. deep and teach are spend-friendly, so they open in Auto; simple
// and off stay frugal (Token-saver: nothing generates until the user clicks).
export function timelineDefaults(mode: "simple" | "deep" | "teach" | null): { seedDepth: ExplainDepth; genAuto: boolean } {
  switch (mode) {
    case "simple": return { seedDepth: "simple", genAuto: false };
    case "teach": return { seedDepth: "teach", genAuto: true };
    case "deep": return { seedDepth: "deep", genAuto: true };
    default: return { seedDepth: "deep", genAuto: false };
  }
}

// Just the parts of a line that change its meaning, so the cache key moves only when the
// content actually changes (not on token counts or timestamps).
function lineKey(l: ReceiptLine): unknown[] {
  return [l.label, l.tool, l.status, l.why, l.raw, l.failSummary];
}

export function actionId(chunkId: string, index: number): string {
  return `${chunkId}#${index}`;
}

function parseActionId(id: string): { chunkId: string; index: number } | null {
  const at = id.lastIndexOf("#");
  if (at < 0) return null;
  const index = Number(id.slice(at + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { chunkId: id.slice(0, at), index };
}

function summaryTasks(chunks: SessionSnapshot["chunks"]): SummaryTask[] {
  return chunks.map((c) => ({ name: c.name, lines: c.receipt.workLines }));
}

interface Located { prompt: string; hash: string; }

// Find what a request points at and build both its prompt and its content hash. Returns null
// when the id does not resolve, so a stale browser id degrades to "nothing to show".
function locate(snap: SessionSnapshot, req: ExplainRequest): Located | null {
  if (req.scope === "task") {
    const c = snap.chunks.find((x) => x.id === req.id);
    if (!c) return null;
    const lines = c.receipt.workLines;
    return { prompt: buildTaskExplainPrompt(c.name, lines, req.depth), hash: hashContent(lines.map(lineKey)) };
  }
  if (req.scope === "action") {
    const parsed = parseActionId(req.id);
    if (!parsed) return null;
    const c = snap.chunks.find((x) => x.id === parsed.chunkId);
    const line = c?.receipt.workLines[parsed.index];
    if (!line) return null;
    return { prompt: buildActionExplainPrompt(line, req.depth), hash: hashContent(lineKey(line)) };
  }
  // summary
  const g = snap.groups.find((x) => x.id === req.id);
  if (!g) return null;
  const tasks = summaryTasks(g.chunks);
  const hash = hashContent([g.prompt, tasks.map((t) => [t.name, t.lines.map(lineKey)])]);
  return { prompt: buildSummaryPrompt(g.prompt, tasks, req.depth), hash };
}

// Resolve a request to text: cache first, then generate through the metered path while the
// budget allows, caching the result. Never throws; failures resolve to null text.
export async function explain(snap: SessionSnapshot, req: ExplainRequest, deps: ExplainDeps): Promise<ExplainResult> {
  const loc = locate(snap, req);
  if (!loc) return { text: null, cached: false, paused: false };

  const hit = readExplanation(req.sessionId, req.scope, req.id, loc.hash, req.depth, deps.root);
  if (hit != null) return { text: hit, cached: true, paused: false };

  if (!budgetAllows(readBudget(deps.sessionDir))) return { text: null, cached: false, paused: true };

  const res = await deps.narrate(loc.prompt);
  if (!res || !res.text.trim()) return { text: null, cached: false, paused: false };
  addSpend(deps.sessionDir, res.tokens);
  const text = stripDashes(res.text.trim());
  // A generation that came back as empty filler ("the agent paused and reflected") says nothing,
  // so we show no panel rather than print it. It is left uncached so a later retry can do better.
  if (isVacuousExplanation(text)) return { text: null, cached: false, paused: false };
  writeExplanation(req.sessionId, req.scope, req.id, loc.hash, req.depth, text, deps.root);
  return { text, cached: false, paused: false };
}

// Fill a freshly built snapshot with any explanations already cached at the given depth, so a
// reopened timeline shows what the user generated before without another round-trip.
export function fillCachedExplanations(snap: SessionSnapshot, depth: ExplainDepth, root: string): SessionSnapshot {
  const chunks = snap.chunks.map((c) => {
    const loc = locate(snap, { sessionId: snap.sessionId, scope: "task", id: c.id, depth });
    const hit = loc ? readExplanation(snap.sessionId, "task", c.id, loc.hash, depth, root) : null;
    return { ...c, explanation: hit };
  });
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const groups = snap.groups.map((g) => {
    const loc = locate(snap, { sessionId: snap.sessionId, scope: "summary", id: g.id, depth });
    const hit = loc ? readExplanation(snap.sessionId, "summary", g.id, loc.hash, depth, root) : null;
    return { ...g, summary: hit, chunks: g.chunks.map((c) => byId.get(c.id) ?? c) };
  });
  return { ...snap, chunks, groups };
}
