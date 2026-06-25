import { describe, it, expect } from "vitest";
import { selectActive } from "./active.js";
import type { SessionListItem } from "../cli/sessions.js";

function s(p: Partial<SessionListItem>): SessionListItem {
  return { id: "x", mtime: 0, name: "n", project: null, color: "c", taskCount: 0,
    lastPromptTs: 0, running: false, open: false, acted: false, live: false, day: "Today", ...p };
}

describe("selectActive", () => {
  it("keeps open terminals (not just running ones), most recent prompt first", () => {
    const items = [
      s({ id: "a", open: true, lastPromptTs: 100 }),
      s({ id: "b", open: false, lastPromptTs: 999 }),
      s({ id: "c", open: true, lastPromptTs: 200 }),
    ];
    expect(selectActive(items).map((x) => x.id)).toEqual(["c", "a"]);
  });
});
