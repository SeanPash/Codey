import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src", "serve", "public", "index.html"), "utf8");

describe("timeline public page session rail", () => {
  it("keeps All, Saved, and Groups as top-level rail modes", () => {
    expect(page).toContain('let railMode = "all"');
    expect(page).toContain('data-filter="all">All sessions');
    expect(page).toContain('data-filter="saved"');
    expect(page).toContain('data-filter="groups"');
    expect(page).not.toContain('<div class="groupbox"');
  });

  it("does not filter the normal session list by a selected group", () => {
    expect(page).not.toContain("let activeGroupId");
    expect(page).not.toContain("No sessions in this group");
    expect(page).toContain('if (railMode === "groups")');
  });

  it("aligns group name, count, rename, and delete controls in centered columns", () => {
    expect(page).toMatch(/\.gitem\s*\{[^}]*display:grid[^}]*grid-template-columns:minmax\(0,1fr\) 34px 28px 28px[^}]*align-items:center/s);
    expect(page).toMatch(/\.gitem \.gc\s*\{[^}]*text-align:center/s);
    expect(page).toMatch(/\.gitem \.ga\s*\{[^}]*display:flex[^}]*align-items:center[^}]*justify-content:center/s);
  });

  it("lets groups mode remove a session from the selected group", () => {
    expect(page).toContain("async function removeSessionFromGroup(sessionId, groupId)");
    expect(page).toContain('method: "DELETE"');
    expect(page).toContain("data-gremove");
  });
});
