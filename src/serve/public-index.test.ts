import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src", "serve", "public", "index.html"), "utf8");

describe("timeline public page session rail", () => {
  it("keeps All, Saved, and Groups as top-level rail modes", () => {
    expect(page).toContain('let railMode = "all"');
    expect(page).toContain('data-filter="all" type="button">All');
    expect(page).toContain('data-filter="saved"');
    expect(page).toContain('data-filter="groups"');
    expect(page).not.toContain('<div class="groupbox"');
  });
  it("renders top-level rail modes as oval pills", () => {
    expect(page).toMatch(/\.railfilters\s*\{[^}]*display:flex[^}]*gap:6px[^}]*margin:2px 2px 10px/s);
    expect(page).not.toMatch(/\.railfilters\s*\{[^}]*flex-direction:column/s);
    expect(page).toMatch(/\.fchip\s*\{[^}]*display:inline-flex[^}]*background:var\(--inset\)[^}]*border:1px solid var\(--line\)[^}]*border-radius:99px[^}]*padding:5px 11px/s);
    expect(page).toMatch(/\.fchip\.on\s*\{[^}]*background:var\(--sel-dim\)[^}]*border-color:var\(--sel\)/s);
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

  it("rolls back group UI changes when persistence fails", () => {
    expect(page).toContain('if (!res.ok) throw new Error("group write failed")');
    expect(page).toContain('if (!res.ok) throw new Error("group delete failed")');
    expect(page).toContain('if (!res.ok) throw new Error("group rename failed")');
    expect(page).toContain('if (!res.ok) throw new Error("group create failed")');
  });
});

describe("timeline group assignment affordances", () => {
  it("offers a Groups button in the title row that opens the picker for the current terminal", () => {
    expect(page).toContain('id="group-current"');
    // sits alongside Rename/Delete in the title actions
    expect(page).toMatch(/id="group-current"[\s\S]*id="rename-current"[\s\S]*id="delete-current"/);
    expect(page).toContain('openGroupPicker(currentId, document.getElementById("group-current"), true)');
  });

  it("keeps the title Groups button anchored to itself and in sync with membership", () => {
    expect(page).toContain("let groupPickerFromTitle = false");
    expect(page).toContain('if (groupPickerFromTitle) return document.getElementById("group-current")');
    expect(page).toContain("function updateGroupButton()");
    // outside-click never closes the picker while interacting with the title button
    expect(page).toContain('e.target.closest("#group-current")');
    // lit when the terminal belongs to at least one group
    expect(page).toMatch(/\.tact\.on\s*\{[^}]*border-color:var\(--sel\)[^}]*background:var\(--sel-dim\)/s);
  });

  it("makes the sidebar Add-to-group control an obvious dashed chip", () => {
    expect(page).toContain('<span class="gplus" aria-hidden="true">+</span>Add to group');
    expect(page).toMatch(/\.sgroups\.add\s*\{[^}]*border:1px dashed var\(--line\)[^}]*border-radius:99px/s);
    expect(page).toMatch(/\.sgroups\.add:hover\s*\{[^}]*border-color:var\(--sel\)/s);
  });

  it("signals a session can join more than one group without clutter", () => {
    // trailing "+" chip after existing group pills
    expect(page).toContain('<span class="gpadd" aria-hidden="true">+</span>');
    expect(page).toMatch(/\.gpadd\s*\{[^}]*border:1px dashed var\(--line\)/s);
    // picker reads as a multi-select list: plural header + real checkboxes
    expect(page).toContain(">Add to groups<");
    expect(page).toContain('class="gcheck${on ? " on" : ""}"');
    expect(page).toMatch(/\.gpoprow \.gcheck\s*\{[^}]*border:1\.5px solid var\(--line\)/s);
  });
});
