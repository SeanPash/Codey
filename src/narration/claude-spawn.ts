// Every headless `claude -p` Codey runs must carry CODEY_HEADLESS so the child's own
// UserPromptSubmit/PreToolUse hooks skip capture. Without it each narration pass records
// itself as a phantom session (an event-less folder that pollutes the timeline).
//
// MAX_THINKING_TOKENS=0 turns off extended thinking for these children only (it never touches
// the user's own session). Narration and segmentation are short summaries, but haiku was
// spending thousands of invisible reasoning tokens before its two sentences, which made a deep
// call cost ~$0.023. With thinking off the same call drops to ~$0.0017 and the answers stay
// just as specific. This is the biggest cost lever Codey has.
export function headlessEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...base, CODEY_HEADLESS: "1", MAX_THINKING_TOKENS: "0" };
}
