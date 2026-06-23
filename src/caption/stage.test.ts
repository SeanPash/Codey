import { describe, it, expect } from "vitest";
import { classifyStage } from "./stage.js";

describe("classifyStage", () => {
  it("maps file reads and searches to inspecting", () => {
    expect(classifyStage("Read", { file_path: "a.ts" })).toBe("inspecting");
    expect(classifyStage("Grep", { pattern: "foo" })).toBe("inspecting");
    expect(classifyStage("Glob", { pattern: "**/*.ts" })).toBe("inspecting");
  });

  it("maps edits and writes to editing", () => {
    expect(classifyStage("Edit", { file_path: "a.ts" })).toBe("editing");
    expect(classifyStage("MultiEdit", { file_path: "a.ts" })).toBe("editing");
    expect(classifyStage("Write", { file_path: "a.ts" })).toBe("editing");
  });

  it("maps thinking and planning tools to planning", () => {
    expect(classifyStage("thinking", null)).toBe("planning");
    expect(classifyStage("Task", { prompt: "go" })).toBe("planning");
  });

  it("reads test and build shell commands as testing", () => {
    expect(classifyStage("Bash", { command: "npx vitest run" })).toBe("testing");
    expect(classifyStage("Bash", { command: "npm test" })).toBe("testing");
    expect(classifyStage("Bash", { command: "npm run build" })).toBe("testing");
    expect(classifyStage("Bash", { command: "npm run typecheck" })).toBe("testing");
  });

  it("reads inspecting shell commands as inspecting", () => {
    expect(classifyStage("Bash", { command: "ls -la" })).toBe("inspecting");
    expect(classifyStage("Bash", { command: "cat package.json" })).toBe("inspecting");
    expect(classifyStage("Bash", { command: "git status" })).toBe("inspecting");
    expect(classifyStage("Bash", { command: "grep -r foo src" })).toBe("inspecting");
  });

  it("reads file-changing shell commands as editing", () => {
    expect(classifyStage("Bash", { command: "rm temp.txt" })).toBe("editing");
    expect(classifyStage("Bash", { command: "mkdir build" })).toBe("editing");
    expect(classifyStage("Bash", { command: "git commit -m wip" })).toBe("editing");
  });

  it("treats an errored post as debugging", () => {
    expect(classifyStage("Bash", { command: "npm test" }, true)).toBe("debugging");
    expect(classifyStage("Edit", { file_path: "a.ts" }, true)).toBe("debugging");
  });

  it("falls back to inspecting for an unknown tool", () => {
    expect(classifyStage("mcp__unity__execute_menu_item", {})).toBe("inspecting");
  });
});
