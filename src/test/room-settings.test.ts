import { describe, expect, it } from "vitest";
import { initialRoomTimer, interviewName } from "@/lib/room-settings";
import { elapsedMs } from "@/lib/types";

describe("mock room settings", () => {
  it("defaults mock rooms to a real 45-minute countdown", () => {
    expect(initialRoomTimer(null)).toEqual({ kind: "countdown", running: false, startedAt: null, accumulatedMs: 0, durationMs: 2700000 });
  });
  it("restores a shared running countdown with time left", () => {
    const timer = initialRoomTimer({ kind: "countdown", running: true, startedAt: 1000, accumulatedMs: 2000, durationMs: 900000 });
    expect(timer.durationMs - elapsedMs(timer, 4000)).toBe(895000);
  });
  it("saves the host's interview name independently of the question", () => {
    expect(interviewName("  Amelia mock  ", "Two Sum")).toBe("Amelia mock");
  });
});