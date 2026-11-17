import { describe, expect, it } from "vitest";
import { codeReviewSchema, questionPatchSchema } from "@/lib/ai-contracts";
import { importedQuestion } from "@/lib/question-patch";

describe("AI result validation", () => {
  it("preserves parameterized starter functions through parsing and question normalization", () => {
    const python = "import sys\n\ndef twoSum(nums, target):\n    # TODO\n    return []\n";
    const parsed = questionPatchSchema.parse({ starter_code: { python } });
    expect(importedQuestion({ starter_code: parsed.starter_code ?? {} }).starter_code["python"]).toBe(python);
  });
  it("rejects empty placeholder reviews", () => expect(codeReviewSchema.safeParse({}).success).toBe(false));
  it("accepts a complete review with actual complexity and edge cases", () => {
    expect(codeReviewSchema.parse({ verdict: "incorrect", correctness: "Always prints zero instead of the sum.", time_complexity: "O(1)", space_complexity: "O(1)", edge_cases: ["1 + 2 should be 3, not 0"], suggestions: ["Read both numbers and add them."] }).verdict).toBe("incorrect");
  });
  it("preserves exact stdin/stdout, including blank lines", () => {
    expect(questionPatchSchema.parse({ test_cases: [{ input: "2\n1 3\n", expected: "\n3\n" }] }).test_cases?.[0]).toEqual({ input: "2\n1 3\n", expected: "\n3\n" });
  });
  it("rejects test cases without expected outputs", () => expect(questionPatchSchema.safeParse({ test_cases: [{ input: "1" }] }).success).toBe(false));
});