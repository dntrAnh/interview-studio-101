import { describe, expect, it } from "vitest";
import { canPostFeedback, validFeedback } from "@/lib/interview-feedback";

describe("interviewer feedback", () => {
  it("allows the mock interviewer to post feedback", () => expect(canPostFeedback("mock", true)).toBe(true));
  it("does not allow candidates or spectators to post feedback", () => expect(canPostFeedback("mock", false)).toBe(false));
  it("does not enable interviewer feedback in solo rooms", () => expect(canPostFeedback("solo", true)).toBe(false));
  it("rejects blank feedback", () => expect(validFeedback(" \n ")).toBe(false));
});