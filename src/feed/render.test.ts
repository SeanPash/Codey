import { describe, it, expect } from "vitest";
import { feedItems, advanceFeed, renderFeedHeader } from "./render.js";
import type { Card } from "../statusline/schedule.js";

const plain = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, "");
const fresh = () => ({ lastSeq: 0, whysShownFor: new Set<number>(), turnsHeadered: new Set<number>(), turnsSummarized: new Set<number>() });

const card = (seq: number, ts: number): Card => ({
  seq, action: { tag: "writing", target: `the file f${seq}.ts` }, raw: `f${seq}.ts`, ts,
});

describe("feedItems", () => {
  it("attaches each why to the card whose window it falls in and keeps the ts", () => {
    const cards = [card(1, 0), card(2, 100)];
    const items = feedItems(cards, [{ ts: 50, why: "first why" }, { ts: 150, why: "second why" }]);
    expect(items).toEqual([
      { seq: 1, ts: 0, tag: "writing", target: "the file f1.ts", why: "first why" },
      { seq: 2, ts: 100, tag: "writing", target: "the file f2.ts", why: "second why" },
    ]);
  });

  it("leaves why null when none falls in the window", () => {
    const items = feedItems([card(1, 0)], []);
    expect(items[0].why).toBeNull();
  });
});

describe("advanceFeed turns", () => {
  it("prints a turn header before the first card of a turn", () => {
    const items = feedItems([card(1, 10)], []);
    const out = plain(advanceFeed(items, fresh(), [10]).text);
    expect(out).toContain("Turn 1");
    expect(out).toContain("#1");
  });

  it("starts a new turn header when a later prompt boundary is crossed", () => {
    const items = feedItems([card(1, 10), card(2, 200)], []);
    const out = plain(advanceFeed(items, fresh(), [10, 150]).text);
    expect(out).toContain("Turn 1");
    expect(out).toContain("Turn 2");
  });

  it("indents each why under its own card", () => {
    const items = feedItems([card(1, 10)], [{ ts: 12, why: "scratch file" }]);
    const out = plain(advanceFeed(items, fresh(), [10]).text);
    const lines = out.split("\n");
    const cardIdx = lines.findIndex((l) => l.includes("#1"));
    const whyIdx = lines.findIndex((l) => l.includes("scratch file"));
    expect(whyIdx).toBe(cardIdx + 1); // why sits directly under its card
  });

  it("appends a summary once a turn is closed by a later turn", () => {
    const items = feedItems([card(1, 10), card(2, 200)], [{ ts: 12, why: "did the thing" }]);
    const out = plain(advanceFeed(items, fresh(), [10, 150]).text);
    expect(out).toContain("summary");
    expect(out).toContain("✓ #1");
  });

  it("does not repeat a header or summary across calls", () => {
    const items = feedItems([card(1, 10), card(2, 200)], []);
    const first = advanceFeed(items, fresh(), [10, 150]);
    const second = advanceFeed(items, first.cursor, [10, 150]);
    expect(second.text).toBe(""); // nothing new to print
  });
});

it("has a header", () => {
  expect(plain(renderFeedHeader())).toContain("codey");
});
