import { describe, it, expect } from "vitest";
import { selectActive, paginate } from "./active.js";
import type { SessionListItem } from "../cli/sessions.js";

function s(p: Partial<SessionListItem>): SessionListItem {
  return { id: "x", mtime: 0, name: "n", taskCount: 0, lastPromptTs: 0, live: false, ...p };
}

describe("selectActive", () => {
  it("keeps only live sessions, most recent prompt first", () => {
    const items = [
      s({ id: "a", live: true, lastPromptTs: 100 }),
      s({ id: "b", live: false, lastPromptTs: 999 }),
      s({ id: "c", live: true, lastPromptTs: 200 }),
    ];
    expect(selectActive(items).map((x) => x.id)).toEqual(["c", "a"]);
  });
});

describe("paginate", () => {
  it("slices a page and reports totals", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(paginate(items, 3, 1)).toEqual({ page: 1, pages: 3, perPage: 3, items: [1, 2, 3] });
    expect(paginate(items, 3, 3)).toEqual({ page: 3, pages: 3, perPage: 3, items: [7] });
  });

  it("clamps an out-of-range page", () => {
    expect(paginate([1, 2], 3, 9).items).toEqual([1, 2]);
  });
});
