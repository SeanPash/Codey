import { describe, it, expect } from "vitest";
import { schedule, type Card } from "./schedule.js";

const card = (seq: number, ts: number): Card => ({
  seq,
  action: { tag: "editing", target: `the file f${seq}.ts` },
  raw: `f${seq}.ts`,
  ts,
});

describe("schedule", () => {
  it("shows nothing when there are no cards", () => {
    expect(schedule([], 1000, () => 4500)).toEqual({ current: null, prev: [], isLatest: true });
  });

  it("shows the only card as the latest", () => {
    const r = schedule([card(1, 0)], 100, () => 4500);
    expect(r.current?.seq).toBe(1);
    expect(r.prev).toEqual([]);
    expect(r.isLatest).toBe(true);
  });

  it("holds the first card until the dwell passes even if a second arrived", () => {
    const cards = [card(1, 0), card(2, 0)];
    const r = schedule(cards, 1000, () => 4500); // 1s < 4.5s dwell
    expect(r.current?.seq).toBe(1);
    expect(r.isLatest).toBe(false);
  });

  it("advances to the next card once the dwell has elapsed", () => {
    const cards = [card(1, 0), card(2, 0)];
    const r = schedule(cards, 5000, () => 4500);
    expect(r.current?.seq).toBe(2);
    expect(r.isLatest).toBe(true);
    expect(r.prev.map((c) => c.seq)).toEqual([1]);
  });

  it("catches up in order without skipping and keeps the last two as prev", () => {
    const cards = [card(1, 0), card(2, 0), card(3, 0), card(4, 0)];
    const r = schedule(cards, 10_000, () => 4500); // room for cards 1,2,3 (0, 4.5k, 9k)
    expect(r.current?.seq).toBe(3);
    expect(r.prev.map((c) => c.seq)).toEqual([1, 2]);
    expect(r.isLatest).toBe(false);
  });

  it("uses the per-card dwell so a slow card holds longer than a fast one", () => {
    const cards = [card(1, 0), card(2, 0)];
    // card 1 dwells 6s; at 5s we should still be on it
    const dwellFor = (c: Card) => (c.seq === 1 ? 6000 : 4000);
    expect(schedule(cards, 5000, dwellFor).current?.seq).toBe(1);
    expect(schedule(cards, 6500, dwellFor).current?.seq).toBe(2);
  });
});
