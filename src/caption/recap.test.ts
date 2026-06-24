import { describe, it, expect } from "vitest";
import { buildRecap } from "./recap.js";
import type { ToolEvent } from "../types.js";

let auto = 0;
const pre = (tool: string, input: unknown): ToolEvent => ({
  id: `e${auto++}`,
  phase: "pre",
  tool,
  server: null,
  input,
  inputHash: "h",
  isError: false,
  errorText: null,
  timestamp: auto,
  sessionId: "s1",
});

describe("buildRecap", () => {
  it("says Updated and names the files when edits happened", () => {
    const r = buildRecap([
      pre("Edit", { file_path: "render.ts" }),
      pre("Edit", { file_path: "compose.ts" }),
    ]);
    expect(r.sentence).toMatch(/^Updated /);
    expect(r.sentence).toMatch(/render\.ts/);
    expect(r.sentence).toMatch(/compose\.ts/);
    expect(r.sentence).not.toMatch(/inspected|fixed/i);
    expect(r.changed).toContain("render.ts");
  });

  it("says Created when the only change was writing new files", () => {
    const r = buildRecap([pre("Write", { file_path: "recap.ts" })]);
    expect(r.sentence).toMatch(/^Created /);
    expect(r.sentence).toMatch(/recap\.ts/);
  });

  it("says inspected, never updated, when Claude only looked around", () => {
    const r = buildRecap([
      pre("Read", { file_path: "index.html" }),
      pre("Grep", { pattern: "groupHtml" }),
    ]);
    expect(r.sentence).toMatch(/inspected|looked|found/i);
    expect(r.sentence).not.toMatch(/updated|created|fixed|verified/i);
  });

  it("only mentions verified when a test or build actually ran", () => {
    const withTests = buildRecap([
      pre("Edit", { file_path: "recap.ts" }),
      pre("Bash", { command: "npx vitest run" }),
    ]);
    expect(withTests.sentence).toMatch(/verified|tests/i);
    expect(withTests.verified).toContain("the tests");

    const noTests = buildRecap([pre("Edit", { file_path: "recap.ts" })]);
    expect(noTests.sentence).not.toMatch(/verified/i);
    expect(noTests.verified).toEqual([]);
  });

  it("reports a test-only run honestly, without claiming a change", () => {
    const r = buildRecap([pre("Bash", { command: "npm test" })]);
    expect(r.sentence).toMatch(/tests/i);
    expect(r.sentence).not.toMatch(/updated|created|fixed/i);
  });

  it("falls back to a complete 'Finished this prompt.' when nothing nameable happened", () => {
    const r = buildRecap([]);
    expect(r.sentence).toBe("Finished this prompt.");
  });

  it("never uses an em dash", () => {
    const r = buildRecap([pre("Edit", { file_path: "a.ts" }), pre("Bash", { command: "npm run build" })]);
    expect(r.sentence).not.toMatch(/[—–]/);
  });
});
