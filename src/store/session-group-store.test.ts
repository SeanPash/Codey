import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addSessionToGroup,
  createGroup,
  deleteGroup,
  listGroups,
  listSessionIdsInGroup,
  readGroupsForSession,
  removeSessionFromGroup,
  renameGroup,
} from "./session-group-store.js";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "codey-groups-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("session-group-store", () => {
  it("creates and lists user-named groups", () => {
    const group = createGroup(root, "Client work")!;
    expect(group.name).toBe("Client work");
    expect(group.id).toBeTruthy();
    expect(listGroups(root)).toEqual([expect.objectContaining({ id: group.id, name: "Client work" })]);
  });

  it("rejects empty group names", () => {
    expect(createGroup(root, "   ")).toBeNull();
  });

  it("renames a group and updates its timestamp", () => {
    const group = createGroup(root, "Old")!;
    const ok = renameGroup(root, group.id, "New");
    expect(ok).toBe(true);
    expect(listGroups(root)[0]).toMatchObject({ id: group.id, name: "New" });
    expect(listGroups(root)[0].updatedAt).toBeGreaterThanOrEqual(group.updatedAt);
  });

  it("does not rename to an empty name", () => {
    const group = createGroup(root, "Keep")!;
    expect(renameGroup(root, group.id, " ")).toBe(false);
    expect(listGroups(root)[0].name).toBe("Keep");
  });

  it("adds sessions to multiple groups without duplicating memberships", () => {
    const a = createGroup(root, "A")!;
    const b = createGroup(root, "B")!;
    expect(addSessionToGroup(root, a.id, "s1")).toBe(true);
    expect(addSessionToGroup(root, a.id, "s1")).toBe(true);
    expect(addSessionToGroup(root, b.id, "s1")).toBe(true);

    expect(readGroupsForSession(root, "s1").map((g) => g.id).sort()).toEqual([a.id, b.id].sort());
    expect(listSessionIdsInGroup(root, a.id)).toEqual(["s1"]);
  });

  it("removes a session from one group without touching another", () => {
    const a = createGroup(root, "A")!;
    const b = createGroup(root, "B")!;
    addSessionToGroup(root, a.id, "s1");
    addSessionToGroup(root, b.id, "s1");

    expect(removeSessionFromGroup(root, a.id, "s1")).toBe(true);
    expect(readGroupsForSession(root, "s1").map((g) => g.id)).toEqual([b.id]);
  });

  it("deletes a group and its memberships", () => {
    const group = createGroup(root, "Done")!;
    addSessionToGroup(root, group.id, "s1");

    expect(deleteGroup(root, group.id)).toBe(true);
    expect(listGroups(root)).toEqual([]);
    expect(readGroupsForSession(root, "s1")).toEqual([]);
  });
});
