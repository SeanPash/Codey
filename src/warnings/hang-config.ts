// How long a single open tool call may run before we treat it as a possible hang.
// Per tool, because some work is legitimately slow: subagents run for minutes and
// builds or installs take a while, but a plain file read should not. A hang can
// only ever mean "unusually long for this kind of step", never "definitely broken",
// so the thresholds are tuned to what is normal for each kind of work.
const DEFAULT_MS = 90_000;

const BY_TOOL: Record<string, number> = {
  // Subagents do their own multi-step work and routinely run for minutes.
  Task: 300_000,
  Agent: 300_000,
  // Shells run builds, installs, and test suites.
  Bash: 180_000,
  PowerShell: 180_000,
  // Fast tools: a stall here is worth surfacing quickly.
  Read: 45_000,
  Edit: 45_000,
  MultiEdit: 45_000,
  Write: 45_000,
  Grep: 45_000,
  Glob: 45_000,
};

export function hangThreshold(tool: string): number {
  return BY_TOOL[tool] ?? DEFAULT_MS;
}
