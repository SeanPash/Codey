import { describe, it, expect } from "vitest";
import { actionLabel } from "./labels.js";

describe("actionLabel", () => {
  it("describes file tools in plain English", () => {
    expect(actionLabel("Read", { file_path: "/a/config.ts" })).toEqual({ tag: "reading", target: "the file config.ts" });
    expect(actionLabel("Edit", { file_path: "/a/auth.ts" })).toEqual({ tag: "editing", target: "the file auth.ts" });
    expect(actionLabel("Grep", { pattern: "validateUser" })).toEqual({ tag: "searching for", target: "validateUser" });
  });

  it("describes common shell commands by what they do", () => {
    expect(actionLabel("Bash", { command: 'rm "C:/Users/x/scratch-demo.txt"' })).toEqual({ tag: "removing", target: "the file scratch-demo.txt" });
    expect(actionLabel("Bash", { command: "mkdir build" })).toEqual({ tag: "creating", target: "the folder build" });
    expect(actionLabel("Bash", { command: "npm test" })).toEqual({ tag: "running", target: "the tests" });
    expect(actionLabel("Bash", { command: "npm install" })).toEqual({ tag: "installing", target: "dependencies" });
    expect(actionLabel("Bash", { command: "git status" })).toEqual({ tag: "running", target: "git status" });
    expect(actionLabel("Bash", { command: "node scripts/build.mjs" })).toEqual({ tag: "running", target: "build.mjs" });
  });

  it("falls back to a generic phrase for unknown tools", () => {
    expect(actionLabel("Write", {})).toEqual({ tag: "writing", target: "a file" });
    expect(actionLabel("WebFetch", {})).toEqual({ tag: "using", target: "WebFetch" });
  });
});
