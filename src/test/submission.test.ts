import { describe, expect, it } from "vitest";
import { canDeleteSnapshot, savedSubmissionSchema } from "@/lib/submission";

describe("saved submissions and snapshots", () => {
  it("keeps added edge cases with the submitted code", () => {
    expect(savedSubmissionSchema.parse({ code: "print(0)", language: "python", submittedAt: "2026-11-17T00:00:00Z", addedTests: [{ input: "0\n", expected: "0\n" }], results: [], error: null }).addedTests).toEqual([{ input: "0\n", expected: "0\n" }]);
  });
  it("allows snapshot owners to delete", () => expect(canDeleteSnapshot("owner", "owner")).toBe(true));
  it("does not allow other members to delete snapshots", () => expect(canDeleteSnapshot("owner", "guest")).toBe(false));
});