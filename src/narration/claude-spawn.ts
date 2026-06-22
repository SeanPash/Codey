// Every headless `claude -p` Codey runs must carry CODEY_HEADLESS so the child's own
// UserPromptSubmit/PreToolUse hooks skip capture. Without it each narration pass records
// itself as a phantom session (an event-less folder that pollutes the timeline).
export function headlessEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...base, CODEY_HEADLESS: "1" };
}
