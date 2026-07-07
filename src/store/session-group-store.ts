import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const GROUPS_FILE = "session-groups.json";

export interface SessionGroup {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionGroupRef {
  id: string;
  name: string;
}

interface SessionGroupMember {
  groupId: string;
  sessionId: string;
  addedAt: number;
}

interface GroupState {
  groups: SessionGroup[];
  members: SessionGroupMember[];
}

function statePath(root: string): string {
  return join(root, GROUPS_FILE);
}

function emptyState(): GroupState {
  return { groups: [], members: [] };
}

function cleanName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
}

function readState(root: string): GroupState {
  const file = statePath(root);
  if (!existsSync(file)) return emptyState();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<GroupState>;
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups.filter((g): g is SessionGroup =>
        !!g && typeof g.id === "string" && typeof g.name === "string"
        && typeof g.createdAt === "number" && typeof g.updatedAt === "number")
      : [];
    const groupIds = new Set(groups.map((g) => g.id));
    const seen = new Set<string>();
    const members = Array.isArray(parsed.members)
      ? parsed.members.filter((m): m is SessionGroupMember => {
        if (!m || typeof m.groupId !== "string" || typeof m.sessionId !== "string" || typeof m.addedAt !== "number") return false;
        if (!groupIds.has(m.groupId)) return false;
        const key = `${m.groupId}\0${m.sessionId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      : [];
    return { groups, members };
  } catch {
    return emptyState();
  }
}

function writeState(root: string, state: GroupState): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(statePath(root), JSON.stringify(state, null, 2));
}

function toRef(g: SessionGroup): SessionGroupRef {
  return { id: g.id, name: g.name };
}

export function listGroups(root: string): SessionGroup[] {
  return readState(root).groups.slice().sort((a, b) => a.createdAt - b.createdAt);
}

export function createGroup(root: string, name: string, now: number = Date.now()): SessionGroup | null {
  const cleaned = cleanName(name);
  if (!cleaned) return null;
  const state = readState(root);
  const group: SessionGroup = { id: randomUUID(), name: cleaned, createdAt: now, updatedAt: now };
  state.groups.push(group);
  writeState(root, state);
  return group;
}

export function renameGroup(root: string, groupId: string, name: string, now: number = Date.now()): boolean {
  const cleaned = cleanName(name);
  if (!cleaned) return false;
  const state = readState(root);
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return false;
  group.name = cleaned;
  group.updatedAt = now;
  writeState(root, state);
  return true;
}

export function deleteGroup(root: string, groupId: string): boolean {
  const state = readState(root);
  const nextGroups = state.groups.filter((g) => g.id !== groupId);
  if (nextGroups.length === state.groups.length) return false;
  state.groups = nextGroups;
  state.members = state.members.filter((m) => m.groupId !== groupId);
  writeState(root, state);
  return true;
}

export function addSessionToGroup(root: string, groupId: string, sessionId: string, now: number = Date.now()): boolean {
  const sid = sessionId.trim();
  if (!sid) return false;
  const state = readState(root);
  if (!state.groups.some((g) => g.id === groupId)) return false;
  if (!state.members.some((m) => m.groupId === groupId && m.sessionId === sid)) {
    state.members.push({ groupId, sessionId: sid, addedAt: now });
    writeState(root, state);
  }
  return true;
}

export function removeSessionFromGroup(root: string, groupId: string, sessionId: string): boolean {
  const state = readState(root);
  const next = state.members.filter((m) => !(m.groupId === groupId && m.sessionId === sessionId));
  if (next.length === state.members.length) return false;
  state.members = next;
  writeState(root, state);
  return true;
}

export function removeSessionFromAllGroups(root: string, sessionId: string): void {
  const state = readState(root);
  const next = state.members.filter((m) => m.sessionId !== sessionId);
  if (next.length === state.members.length) return;
  state.members = next;
  writeState(root, state);
}

export function listSessionIdsInGroup(root: string, groupId: string): string[] {
  return readState(root).members
    .filter((m) => m.groupId === groupId)
    .sort((a, b) => a.addedAt - b.addedAt)
    .map((m) => m.sessionId);
}

export function readGroupsForSession(root: string, sessionId: string): SessionGroupRef[] {
  const state = readState(root);
  const byId = new Map(state.groups.map((g) => [g.id, g]));
  return state.members
    .filter((m) => m.sessionId === sessionId)
    .map((m) => byId.get(m.groupId))
    .filter((g): g is SessionGroup => !!g)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(toRef);
}

export function readGroupsForSessions(root: string): Map<string, SessionGroupRef[]> {
  const state = readState(root);
  const byId = new Map(state.groups.map((g) => [g.id, g]));
  const out = new Map<string, SessionGroupRef[]>();
  for (const member of state.members) {
    const group = byId.get(member.groupId);
    if (!group) continue;
    const list = out.get(member.sessionId) ?? [];
    list.push(toRef(group));
    out.set(member.sessionId, list);
  }
  for (const refs of out.values()) refs.sort((a, b) => {
    const ga = byId.get(a.id);
    const gb = byId.get(b.id);
    return (ga?.createdAt ?? 0) - (gb?.createdAt ?? 0);
  });
  return out;
}
