import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { summarizeCosts, renderCosts } from "../timeline/costs.js";
import { latestSessionId } from "./sessions.js";

export function runCosts(): void {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const turns = readTranscriptTurns(readMeta(session)?.transcriptPath ?? null);
  console.log(renderCosts(summarizeCosts(turns)));
}
