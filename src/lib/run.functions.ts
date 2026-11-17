import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLanguage } from "./languages";
import type { TestCase } from "./types";

export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { language: string; code: string; tests: TestCase[]; customInput?: string }) => {
    if (typeof input.code !== "string" || input.code.length > 100_000) throw new Error("Code too long");
    return { ...input, tests: (input.tests ?? []).slice(0, 10) };
  })
  .handler(async ({ data }) => {
    const { executeTests } = await import("./judge0.server");
    const key = process.env["JUDGE0_API_KEY"];
    const lang = getLanguage(data.language);
    return executeTests({ ...data, languageId: lang.judge0, key, url: process.env["JUDGE0_URL"] });
  });
