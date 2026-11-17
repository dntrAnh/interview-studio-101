import { z } from "zod";
import type { TimerState } from "./types";

export const timerSchema = z.object({
  kind: z.enum(["countdown", "stopwatch"]), running: z.boolean(),
  startedAt: z.number().nullable(), accumulatedMs: z.number().nonnegative(), durationMs: z.number().nonnegative(),
});
export function initialRoomTimer(saved: unknown): TimerState {
  const parsed = timerSchema.safeParse(saved);
  return parsed.success ? parsed.data : { kind: "countdown", running: false, startedAt: null, accumulatedMs: 0, durationMs: 45 * 60000 };
}
export function interviewName(name: string, questionTitle: string) {
  return name.trim() || questionTitle.trim() || "Mock interview";
}