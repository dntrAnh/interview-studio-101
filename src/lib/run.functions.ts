import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getLanguage } from "./languages";
import type { RunResult, TestCase } from "./types";

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s: string | null | undefined) => {
  if (!s) return "";
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return s;
  }
};

export const runCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { language: string; code: string; tests: TestCase[]; customInput?: string }) => {
    if (typeof input.code !== "string" || input.code.length > 100_000) throw new Error("Code too long");
    return { ...input, tests: (input.tests ?? []).slice(0, 10) };
  })
  .handler(async ({ data }) => {
    const key = process.env["JUDGE0_API_KEY"];
    const base = process.env["JUDGE0_URL"] || "https://judge0-ce.p.rapidapi.com";
    if (!key && !process.env["JUDGE0_URL"]) {
      return { ok: false as const, error: "Code running isn't set up yet. Add a Judge0 key to enable it.", results: [] as RunResult[] };
    }
    const lang = getLanguage(data.language);
    const cases: { input: string; expected: string | null }[] = data.tests.length
      ? data.tests.map((t) => ({ input: t.input, expected: t.expected }))
      : [{ input: data.customInput ?? "", expected: null }];

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (key) {
      headers["X-RapidAPI-Key"] = key;
      headers["X-RapidAPI-Host"] = new URL(base).host;
      headers["X-Auth-Token"] = key;
    }

    const results = await Promise.all(
      cases.map(async (c, index): Promise<RunResult> => {
        const r = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
          method: "POST",
          headers,
          body: JSON.stringify({ language_id: lang.judge0, source_code: b64(data.code), stdin: b64(c.input) }),
        });
        if (!r.ok) {
          return { index, input: c.input, expected: c.expected, stdout: "", stderr: `Runner error ${r.status}`, status: "Error", passed: null, time: null };
        }
        const j = (await r.json()) as {
          stdout?: string; stderr?: string; compile_output?: string; message?: string; time?: string;
          status?: { description?: string };
        };
        const stdout = unb64(j.stdout);
        const stderr = [unb64(j.compile_output), unb64(j.stderr), unb64(j.message)].filter(Boolean).join("\n");
        const passed = c.expected === null ? null : stdout.trim() === c.expected.trim();
        return { index, input: c.input, expected: c.expected, stdout, stderr, status: j.status?.description ?? "Done", passed, time: j.time ?? null };
      }),
    );
    return { ok: true as const, error: null, results };
  });
