import { appendFileSync } from "node:fs";
import { join } from "node:path";

// The detached narrator runs with no console, so a failed claude call used to vanish: the engine
// just saw null and the status line stayed blank with no hint why. This log is the breadcrumb. It
// lives next to the session's events so a quiet narrator can always be diagnosed after the fact.
export function logNarrator(dir: string, line: string): void {
  try {
    appendFileSync(join(dir, "narrator.log"), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // Logging is best-effort; it must never be the thing that breaks narration.
  }
}

interface ExecError {
  code?: string | number | null;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
  message?: string;
}

// Turn an execFile failure into one readable line. The cases that actually bite the headless
// narrator are a missing `claude` on PATH (ENOENT) and a call that outran its budget (killed by
// the timeout), so name those plainly and fold in any stderr the CLI managed to print.
export function describeExecError(err: ExecError | null, stderr?: string): string {
  if (!err) return "claude returned no usable result";
  const parts: string[] = [];
  if (err.killed || err.signal) parts.push("timed out");
  if (err.code === "ENOENT") parts.push("claude not found on PATH");
  else if (err.code != null) parts.push(`exit ${err.code}`);
  if (parts.length === 0 && err.message) parts.push(err.message.split("\n")[0]);
  const tail = (stderr ?? "").trim().split("\n")[0];
  if (tail) parts.push(tail.length > 120 ? tail.slice(0, 119) + "…" : tail);
  return parts.join("; ") || "claude call failed";
}
