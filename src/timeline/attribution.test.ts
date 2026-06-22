import { describe, it, expect } from "vitest";
import { describeAction, rawDetail, failSummaryFrom, attributeChunk } from "./attribution.js";
import type { AssistantTurn } from "./transcript.js";

function turn(over: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, ...over };
}

describe("describeAction", () => {
  it("names file actions by basename", () => {
    expect(describeAction("Write", { file_path: "/p/PlayerController.cs" })).toBe("Writing PlayerController.cs");
    expect(describeAction("Edit", { file_path: "/p/a.cs" })).toBe("Editing a.cs");
    expect(describeAction("Read", { file_path: "/p/b.cs" })).toBe("Reading b.cs");
  });
  it("keeps the bash label plain; the command goes to raw", () => {
    expect(describeAction("Bash", { command: "dotnet build MyGame.sln" })).toBe("Ran a command");
  });
  it("names an mcp action by action + server", () => {
    expect(describeAction("mcp__unity__execute_menu_item", { menu: "x" })).toBe("Execute menu item via unity");
  });
  it("labels a non-tool / thinking turn", () => {
    expect(describeAction(null, null)).toBe("Thinking it through");
    expect(describeAction("thinking", null)).toBe("Thinking it through");
  });
});

describe("rawDetail", () => {
  it("returns the full untruncated command for bash", () => {
    const cmd = "git log --oneline -10 && echo done";
    expect(rawDetail("Bash", { command: cmd })).toBe(cmd);
  });
  it("returns the full path for file tools", () => {
    expect(rawDetail("Read", { file_path: "/a/b/c.ts" })).toBe("/a/b/c.ts");
  });
  it("is null when there is nothing to show", () => {
    expect(rawDetail("Grep", { pattern: "x" })).toBeNull();
    expect(rawDetail(null, null)).toBeNull();
  });
});

describe("failSummaryFrom", () => {
  it("surfaces an exit code when present", () => {
    expect(failSummaryFrom("Bash", "Exit code 2\nsome noise")).toBe("This command failed (exit code 2).");
  });
  it("stays generic without an exit code", () => {
    expect(failSummaryFrom("Read", "ENOENT")).toBe("This step didn't succeed.");
  });
});

describe("attributeChunk", () => {
  const turns: AssistantTurn[] = [
    turn({ ts: 100, outputTokens: 3200, inputTokens: 1000, cacheReadTokens: 5000, tool: "Write", input: { file_path: "/p/move.cs" } }),
    turn({ ts: 200, outputTokens: 400, inputTokens: 1200, cacheReadTokens: 6000, tool: "Bash", input: { command: "dotnet build" }, isError: true, errorText: "CS0103" }),
    turn({ ts: 300, outputTokens: 800, inputTokens: 900, cacheReadTokens: 4000, tool: "Bash", input: { command: "dotnet build" } }),
    turn({ ts: 9999, outputTokens: 999, tool: "Read", input: { file_path: "/p/late.cs" } }), // outside window
  ];

  it("sums output as work and input+cache as context, within the window", () => {
    const b = attributeChunk(turns, 0, 1000);
    expect(b.workTotal).toBe(3200 + 400 + 800);
    expect(b.contextTotal).toBe((1000 + 5000) + (1200 + 6000) + (900 + 4000));
    expect(b.workLines).toHaveLength(3);
  });

  it("marks a failed action resolved when a later same-tool action in the window succeeds", () => {
    const b = attributeChunk(turns, 0, 1000);
    const failed = b.workLines.find((l) => l.status === "fail");
    expect(failed?.errorText).toBe("CS0103");
    expect(failed?.resolved).toBe(true);
  });

  it("excludes turns outside the window", () => {
    const b = attributeChunk(turns, 0, 1000);
    expect(b.workLines.some((l) => l.label.includes("late.cs"))).toBe(false);
  });
});
