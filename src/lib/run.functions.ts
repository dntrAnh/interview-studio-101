import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLanguage, withStandardImports } from "./languages";
import type { TestCase } from "./types";

export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { language: string; code: string; tests: TestCase[]; customInput?: string }) => {
    if (typeof input.code !== "string" || input.code.length > 100_000) throw new Error("Code too long");
    if (!Array.isArray(input.tests) || input.tests.length > 20 || input.tests.some(t => typeof t.input !== "string" || typeof t.expected !== "string")) throw new Error("Provide at most 20 stdin/stdout test cases.");
    return input;
  })
  .handler(async ({ data }) => {
    const { executeTests } = await import("./judge0.server");
    const lang = getLanguage(data.language);
    return executeTests({ ...data, code: withStandardImports(data.code, data.language), languageId: lang.judge0 });
  });
