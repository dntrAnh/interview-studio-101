import { z } from "zod";

export const questionPatchSchema = z.object({
  title: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  description: z.string().optional(),
  hints: z.array(z.string()).optional(),
  complexity: z.string().optional(),
  test_cases: z.array(z.object({ input: z.string(), expected: z.string() })).optional(),
});

export const codeReviewSchema = z.object({
  verdict: z.enum(["correct", "partially_correct", "incorrect"]),
  correctness: z.string().trim().min(1),
  time_complexity: z.string().trim().min(1),
  space_complexity: z.string().trim().min(1),
  edge_cases: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type CodeReview = z.infer<typeof codeReviewSchema>;

export const IMPORT_INSTRUCTIONS = `Parse the pasted LeetCode or HackerRank problem faithfully; ignore navigation, advertisements, discussion and solution content. Preserve the exact problem semantics, constraints, examples, tie-breaking, ordering, indexing, mutation requirements and return values. Do not invent constraints. If something essential is absent, explicitly mark it unspecified rather than silently guessing.
Use Markdown headings for Problem, Input Format, Output Format, Examples, Constraints, Edge Cases, and Test Coverage. Preserve HackerRank's original multi-test-case and count-prefixed stdin/stdout formats. For a LeetCode function-signature problem, preserve the original signature in the description AND define one explicit executable stdin/stdout adapter: parameter order, array/matrix lengths, empty collections, strings, booleans, null/tree serialization and output encoding when relevant. Translate every generated test into that same adapter. Explain that the room executes a complete program reading stdin, not the platform's hidden harness.
Create up to 10 small deterministic tests: the given examples plus relevant minimum valid size, duplicates, negative/zero values, sorted/reversed input, boundary equalities, off-by-one, empty inputs only when allowed, ties and overflow cases. Derive each expected output step by step; omit any case whose answer cannot be established confidently. Never use ellipses or prose as expected output. For problems accepting multiple valid answers, specify a deterministic compatible convention or omit tests requiring a unique answer. Describe large-input/performance risks without creating huge fixtures.
Official hidden tests are unavailable: never claim to retrieve, reproduce, or pass them. Label additional tests as generated practice edge cases and explicitly state that they are not official hidden tests. Provide up to 3 progressive hints and justified optimal time/space complexity. Return title, difficulty, description, hints, complexity, test_cases.`;