import { describe, expect, it } from "vitest";
import { elapsedMs, formatMs } from "@/lib/types";

describe("timer", () => {
  it("counts paused time plus the running stretch", () => {
    expect(elapsedMs({ kind: "stopwatch", running: true, startedAt: 1000, accumulatedMs: 5000, durationMs: 0 }, 4000)).toBe(8000);
  });
  it("shows countdown overtime as negative", () => {
    expect(formatMs(45 * 60000 - 46 * 60000)).toBe("-01:00");
  });
});
