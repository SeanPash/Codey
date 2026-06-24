import { describe, it, expect } from "vitest";
import { describeAction, actionTitle, actionSubtitle, rawDetail, failSummaryFrom, attributeChunk } from "./attribution.js";
import { hasBannedPhrase } from "../caption/banned.js";
import type { AssistantTurn } from "./transcript.js";

function turn(over: Partial<AssistantTurn>): AssistantTurn {
  return { ts: 0, outputTokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0,
    tool: null, input: null, isError: false, errorText: null, toolUseId: null, assistantText: null, ...over };
}

describe("describeAction", () => {
  it("names file actions by basename", () => {
    expect(describeAction("Write", { file_path: "/p/PlayerController.cs" })).toBe("Writing PlayerController.cs");
    expect(describeAction("Edit", { file_path: "/p/a.cs" })).toBe("Editing a.cs");
    expect(describeAction("Read", { file_path: "/p/b.cs" })).toBe("Reading b.cs");
  });
  it("uses the command's own description as the label when present", () => {
    expect(describeAction("Bash", { command: "dotnet build MyGame.sln", description: "Build the game" })).toBe("Build the game");
    expect(describeAction("PowerShell", { command: "git status", description: "Show working tree status" })).toBe("Show working tree status");
  });
  it("falls back to a plain label when a command has no description", () => {
    expect(describeAction("Bash", { command: "dotnet build MyGame.sln" })).toBe("Ran a command");
    expect(describeAction("PowerShell", { command: "git status" })).toBe("Ran a command");
  });
  it("names an mcp action by action + server", () => {
    expect(describeAction("mcp__unity__execute_menu_item", { menu: "x" })).toBe("Execute menu item via unity");
  });
  it("labels a non-tool / thinking turn", () => {
    expect(describeAction(null, null)).toBe("Thinking it through");
    expect(describeAction("thinking", null)).toBe("Thinking it through");
  });
  it("phrases a search pattern instead of a flat 'searched the code'", () => {
    expect(describeAction("Grep", { pattern: "validateUser" })).toBe("Searched for validateUser");
    expect(describeAction("Glob", { pattern: "**/watch*" })).toBe("Searched for watch");
  });
});

describe("actionTitle", () => {
  it("frames file work as a purpose, not the tool", () => {
    expect(actionTitle("Write", { file_path: "/p/math.js" })).toBe("Adding math.js");
    expect(actionTitle("Edit", { file_path: "/p/math.test.js" })).toBe("Updating math tests");
    expect(actionTitle("Read", { file_path: "/p/render.ts" })).toBe("Checking render.ts");
  });
  it("frames a search by what it looks for", () => {
    expect(actionTitle("Grep", { pattern: "validateUser" })).toBe("Checking validateUser");
  });
  it("frames a shell command by its real purpose, not the tool", () => {
    expect(actionTitle("Bash", { command: "npm run build" })).toMatch(/build/i);
    expect(actionTitle("Bash", { command: "git status" })).toMatch(/change/i);
    expect(actionTitle("Bash", { command: "git status" })).not.toMatch(/ran a command|a command/i);
  });
  it("calls a thinking turn what it is", () => {
    expect(actionTitle("thinking", null)).toBe("Thinking it through");
    expect(actionTitle(null, null)).toBe("Thinking it through");
  });
});

describe("actionSubtitle", () => {
  it("uses the command's own description when present", () => {
    expect(actionSubtitle("Bash", { command: "node test.js", description: "Run the demo math tests" }))
      .toBe("Run the demo math tests.");
  });
  it("names the real subject for a file or search", () => {
    expect(actionSubtitle("Read", { file_path: "/p/render.ts" })).toMatch(/render\.ts/);
    expect(actionSubtitle("Grep", { pattern: "validateUser" })).toMatch(/validateUser/);
  });

  it("never falls back to the banned 'follow how it works' / 'adjust how it works' fillers", () => {
    const files = [
      "C:/Codey/src/statusline/render.ts",
      "C:/Codey/src/statusline/view.ts",
      "C:/Codey/src/statusline/compose.ts",
      "C:/Codey/src/capture/prompt-mark.ts",
      "C:/Codey/src/timeline/transcript.ts",
      "C:/Codey/src/timeline/costs.ts",
      "C:/Codey/src/serve/index.html",
      "C:/Codey/src/caption/banned.ts",
      "C:/Codey/src/caption/banned.test.ts",
    ];
    for (const file_path of files) {
      const read = actionSubtitle("Read", { file_path });
      const edit = actionSubtitle("Edit", { file_path });
      // Purpose-based: it names the real file (its stem, since a test file reads as "X tests")
      // and avoids every banned filler.
      const stem = file_path.split("/").pop()!.split(".")[0];
      expect(read).toContain(stem);
      expect(hasBannedPhrase(read)).toBe(false);
      expect(hasBannedPhrase(edit)).toBe(false);
    }
  });

  it("grounds a caption in the folder area when the path has one", () => {
    // render.ts under src/statusline reads as "the statusline code", not a generic filler.
    expect(actionSubtitle("Read", { file_path: "C:/Codey/src/statusline/render.ts" })).toContain("statusline");
    expect(actionSubtitle("Edit", { file_path: "C:/Codey/src/timeline/costs.ts" })).toContain("timeline");
  });

  it("phrases a no-subject search without the banned 'for the code' tail", () => {
    const sub = actionSubtitle("Grep", { pattern: "\\bfoo\\b.*\\[bar\\]" });
    expect(hasBannedPhrase(sub)).toBe(false);
  });
});

describe("rawDetail", () => {
  it("returns the full untruncated command for bash and powershell", () => {
    const cmd = "git log --oneline -10 && echo done";
    expect(rawDetail("Bash", { command: cmd })).toBe(cmd);
    expect(rawDetail("PowerShell", { command: cmd })).toBe(cmd);
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

  it("sets line why from assistantText when present", () => {
    const t = [turn({ ts: 100, outputTokens: 50, tool: "Read", input: { file_path: "/x.ts" }, assistantText: "Let me check the config." })];
    const b = attributeChunk(t, 0, 200);
    expect(b.workLines[0].why).toBe("Let me check the config.");
  });

  it("leaves line why null when assistantText is absent", () => {
    const t = [turn({ ts: 100, outputTokens: 50, tool: "Read", input: { file_path: "/x.ts" }, assistantText: null })];
    const b = attributeChunk(t, 0, 200);
    expect(b.workLines[0].why).toBeNull();
  });
});
