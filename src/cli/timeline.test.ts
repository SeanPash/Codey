import { describe, it, expect } from "vitest";
import { timelineDecision } from "./timeline.js";

describe("timelineDecision", () => {
  it("spawns when there is no lock", () => {
    expect(timelineDecision(null, () => true)).toEqual({ reuse: false, port: 4317 });
  });

  it("reuses a server that is answering on its recorded port", () => {
    expect(timelineDecision({ port: 4400, pid: 123 }, (port) => port === 4400)).toEqual({ reuse: true, port: 4400 });
  });

  it("spawns again when nothing answers on the recorded port", () => {
    expect(timelineDecision({ port: 4400, pid: 123 }, () => false)).toEqual({ reuse: false, port: 4317 });
  });
});
