import { describe, it, expect } from "vitest";
import { feedItems, renderFeed, renderFeedHeader, advanceFeed } from "./render.js";
import type { Card } from "../statusline/schedule.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");

const card = (seq: number, ts: number): Card => ({
  seq, action: { tag: "writing", target: `the file f${seq}.ts` }, raw: `f${seq}.ts`, ts,
});

describe("feedItems", () => {
  it("attaches each why to the card whose window it falls in", () => {
    const cards = [card(1, 0), card(2, 100)];
    const items = feedItems(cards, [{ ts: 50, why: "first why" }, { ts: 150, why: "second why" }]);
    expect(items).toEqual([
      { seq: 1, tag: "writing", target: "the file f1.ts", why: "first why" },
      { seq: 2, tag: "writing", target: "the file f2.ts", why: "second why" },
    ]);
  });

  it("leaves why null when none falls in the window", () => {
    const items = feedItems([card(1, 0)], []);
    expect(items[0].why).toBeNull();
  });
});

describe("renderFeed", () => {
  it("lists each task with its number and why", () => {
    const out = plain(renderFeed(feedItems([card(1, 0)], [{ ts: 1, why: "scratch file" }])));
    expect(out).toContain("#1 writing the file f1.ts");
    expect(out).toContain("scratch file");
  });
});

describe("advanceFeed", () => {
  it("emits only new cards and remembers the cursor", () => {
    const items = feedItems([card(1, 0), card(2, 10)], []);
    const first = advanceFeed(items.slice(0, 1), { lastSeq: 0, whysShownFor: new Set() });
    expect(plain(first.text)).toContain("#1");
    const second = advanceFeed(items, first.cursor);
    expect(plain(second.text)).toContain("#2");
    expect(plain(second.text)).not.toContain("#1");
  });

  it("emits a late why for a card already printed", () => {
    const before = advanceFeed(feedItems([card(1, 0)], []), { lastSeq: 0, whysShownFor: new Set() });
    const after = advanceFeed(feedItems([card(1, 0)], [{ ts: 1, why: "late why" }]), before.cursor);
    expect(plain(after.text)).toContain("late why");
  });
});

it("has a header", () => {
  expect(plain(renderFeedHeader())).toContain("codey");
});
