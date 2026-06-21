import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";
import { readPrompts } from "../capture/prompts.js";
import { currentTurnStart, eventsForCurrentTurn, buildExplainPrompt, parseExplainArgs, eventForTask } from "../narration/explain.js";
import { appendPass, passesForScope } from "../narration/explain-log.js";
import { runClaudeMetered } from "../narration/claude-metered.js";
import { addSpend } from "../budget/budget.js";
import type { ToolEvent } from "../types.js";

function readEvents(dir: string): ToolEvent[] {
  const p = join(dir, "events.jsonl");
  if (!existsSync(p)) return [];
  const out: ToolEvent[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as ToolEvent); } catch { /* partial line */ }
  }
  return out;
}

export async function runExplain(args: string[] = []): Promise<void> {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const dir = join(defaultRoot(), session);

  const { depth, task } = parseExplainArgs(args);
  const start = currentTurnStart(readPrompts(dir));
  const turnEvents = eventsForCurrentTurn(readEvents(dir), start);

  // NEGATIVE_INFINITY does not survive JSON, so key the pre-first-prompt turn as 0.
  const turnKey = start === Number.NEGATIVE_INFINITY ? 0 : start;

  // A task number narrows to a single tool call and keeps its own deepening scope; with no
  // task we explain the whole turn.
  let events = turnEvents;
  let scope = String(turnKey);
  if (task != null) {
    events = eventForTask(turnEvents, task);
    scope = `${turnKey}:t${task}`;
    if (events.length === 0) {
      console.log(`Task #${task} hasn't happened yet this turn.`);
      return;
    }
  } else if (events.length === 0) {
    console.log("Nothing to explain yet; Claude has not started working on this prompt.");
    return;
  }

  const prior = passesForScope(dir, scope);
  const prompt = buildExplainPrompt(events, prior, depth);
  const result = await runClaudeMetered(prompt, 30_000);
  if (!result) {
    console.log("Could not reach Claude for an explanation just now. Try again in a moment.");
    return;
  }

  // /explain is a manual pull: it always runs, but its spend is still metered so the
  // budget numbers stay honest.
  addSpend(dir, result.tokens);
  appendPass(dir, scope, result.text);
  console.log(result.text);
}
