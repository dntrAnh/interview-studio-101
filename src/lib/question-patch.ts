import { emptyQuestion, type QuestionData } from "./types";

export function importedQuestion(p: Partial<QuestionData>): QuestionData {
  return {
    ...emptyQuestion(),
    title: typeof p.title === "string" ? p.title : "Imported question",
    difficulty: ["Easy", "Medium", "Hard"].includes(p.difficulty ?? "") ? String(p.difficulty) : "Medium",
    description: typeof p.description === "string" ? p.description : "",
    hints: Array.isArray(p.hints) ? p.hints.map(String) : [],
    complexity: typeof p.complexity === "string" ? p.complexity : "",
    test_cases: Array.isArray(p.test_cases) ? p.test_cases.map(t => ({ input: String(t.input ?? ""), expected: String(t.expected ?? "") })) : [],
    starter_code: p.starter_code && typeof p.starter_code === "object" ? Object.fromEntries(Object.entries(p.starter_code).filter(([, v]) => typeof v === "string")) : {},
  };
}