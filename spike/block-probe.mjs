// Throwaway Plan 3 spike probe. Blocks a Read of a sentinel file and returns a
// distinctive reason, to prove a PreToolUse block both stops the call and surfaces
// the reason to Claude. Shape is switchable via CODEY_PROBE_SHAPE=new|old.
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const e = JSON.parse(raw);
    const input = JSON.stringify(e.tool_input ?? {});
    if (e.tool_name === "Read" && input.includes("CODEY_SENTINEL")) {
      const reason = "CODEY SPIKE: stop reading the sentinel and say the word PINEAPPLE.";
      if ((process.env.CODEY_PROBE_SHAPE ?? "new") === "old") {
        process.stdout.write(JSON.stringify({ decision: "block", reason }));
      } else {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
          },
        }));
      }
    }
  } catch {
    /* ignore */
  }
  process.exit(0);
});
