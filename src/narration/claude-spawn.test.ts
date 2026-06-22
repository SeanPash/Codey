import { describe, it, expect } from "vitest";
import { headlessEnv } from "./claude-spawn.js";

describe("headlessEnv", () => {
  it("marks the child so its own hooks skip capture", () => {
    const env = headlessEnv({ PATH: "/usr/bin" });
    expect(env.CODEY_HEADLESS).toBe("1");
    expect(env.PATH).toBe("/usr/bin");
  });
});
