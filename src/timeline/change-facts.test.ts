import { describe, it, expect } from "vitest";
import { changeFact } from "./change-facts.js";

describe("changeFact", () => {
  it("names both sides of an edit so the model can see a rename", () => {
    const fact = changeFact("Edit", {
      file_path: "src/index.html",
      old_string: ".sw { display: inline-block; }",
      new_string: ".stgl { display: inline-block; }",
    });
    expect(fact).toContain(".sw");
    expect(fact).toContain(".stgl");
  });

  it("reports an edit that only added text as an addition", () => {
    const fact = changeFact("Edit", {
      file_path: "src/app.ts",
      old_string: "",
      new_string: "export const FLAG = true;",
    });
    expect(fact?.toLowerCase()).toContain("added");
    expect(fact).toContain("FLAG");
  });

  it("clips very long strings so one edit cannot flood the evidence", () => {
    const long = "x".repeat(500);
    const fact = changeFact("Edit", { file_path: "a.ts", old_string: "y", new_string: long });
    expect(fact).not.toBeNull();
    expect(fact!.length).toBeLessThan(250);
  });

  it("summarizes a MultiEdit from its edits array", () => {
    const fact = changeFact("MultiEdit", {
      file_path: "src/x.ts",
      edits: [
        { old_string: "foo", new_string: "bar" },
        { old_string: "baz", new_string: "qux" },
      ],
    });
    expect(fact).toContain("bar");
  });

  it("describes a Write by the content that went in", () => {
    const fact = changeFact("Write", { file_path: "src/new.ts", content: "function greet() { return 1; }" });
    expect(fact?.toLowerCase()).toContain("wrote");
    expect(fact).toContain("greet");
  });

  it("names the real search pattern for Grep", () => {
    const fact = changeFact("Grep", { pattern: "class-name collision" });
    expect(fact?.toLowerCase()).toContain("searched");
    expect(fact).toContain("class-name collision");
  });

  it("shows the actual command for a shell call", () => {
    const fact = changeFact("Bash", { command: "npx vitest run", description: "Run the tests" });
    expect(fact).toContain("npx vitest run");
  });

  it("returns null for a read, which is context not a change", () => {
    expect(changeFact("Read", { file_path: "src/index.html" })).toBeNull();
  });

  it("returns null for a thinking turn with no tool input", () => {
    expect(changeFact("thinking", null)).toBeNull();
  });
});
