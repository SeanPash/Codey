import { describe, it, expect } from "vitest";
import { timelineDecision, type ServeLock, type Probe } from "./timeline.js";

const BUILD = "/install/abc";

describe("timelineDecision", () => {
  const probe = (p: Probe) => () => p;

  it("spawns when there is no lock", () => {
    expect(timelineDecision(null, BUILD, probe({ up: false, build: null })))
      .toEqual({ action: "spawn", port: 4317 });
  });

  it("reuses a server that answers with the current build", () => {
    const lock: ServeLock = { port: 4400, pid: 123, build: BUILD };
    expect(timelineDecision(lock, BUILD, probe({ up: true, build: BUILD })))
      .toEqual({ action: "reuse", port: 4400 });
  });

  it("spawns again when nothing answers on the recorded port", () => {
    const lock: ServeLock = { port: 4400, pid: 123, build: BUILD };
    expect(timelineDecision(lock, BUILD, probe({ up: false, build: null })))
      .toEqual({ action: "spawn", port: 4317 });
  });

  it("replaces a stale server whose build differs", () => {
    const lock: ServeLock = { port: 4317, pid: 999, build: "/install/old" };
    expect(timelineDecision(lock, BUILD, probe({ up: true, build: "/install/old" })))
      .toEqual({ action: "replace", port: 4317, pid: 999 });
  });

  it("replaces a server that does not report a build (pre-/health)", () => {
    const lock: ServeLock = { port: 4317, pid: 999, build: "" };
    expect(timelineDecision(lock, BUILD, probe({ up: true, build: null })))
      .toEqual({ action: "replace", port: 4317, pid: 999 });
  });
});
