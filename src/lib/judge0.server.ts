import type { RunResult, TestCase } from "./types";

export const DIRECT_CE = "https://ce.judge0.com";
const encode = (s: string) => btoa(unescape(encodeURIComponent(s)));
const decode = (s?: string | null) => {
  if (!s) return "";
  try { return decodeURIComponent(escape(atob(s))); } catch { return s; }
};
export function runnerMessage(status: number) {
  if (status === 429) return "Rate limit exceeded. Please wait a moment before running again.";
  if (status === 401 || status === 403) return "The public Judge0 runner is not accepting submissions right now. Please try again later.";
  if (status >= 500) return "The code runner is temporarily unavailable. Please try again later.";
  return `The code runner could not accept this submission (HTTP ${status}).`;
}

export async function executeTests(options: {
  languageId: number; code: string; tests: TestCase[]; customInput?: string;
  fetcher?: typeof fetch; pause?: (ms: number) => Promise<void>;
}) {
  const fetcher = options.fetcher ?? fetch;
  const pause = options.pause ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const base = DIRECT_CE;
  const results: RunResult[] = [];
  const cases = options.tests.length ? options.tests : [{ input: options.customInput ?? "", expected: null }];
  let error: string | null = null;
  for (const [index, c] of cases.entries()) {
    if (index) await pause(1100);
    let response: Response | undefined;
    let failure = "";
    {
      const headers: Record<string, string> = { "content-type": "application/json" };
      try {
        response = await fetcher(`${base}/submissions?base64_encoded=true&wait=true`, {
          method: "POST", headers, signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ language_id: options.languageId, source_code: encode(options.code), stdin: encode(c.input) }),
        });
        if (!response.ok) failure = runnerMessage(response.status);
      } catch { failure = "The code runner could not be reached or took too long. Please try again."; }
    }
    if (!response?.ok) { error = failure; break; }
    try {
      let j = await response.json() as { token?: string; stdout?: string; stderr?: string; compile_output?: string; message?: string; time?: string; status?: { id?: number; description?: string } };
      for (let poll = 0; (j.status?.id ?? 3) <= 2 && j.token && poll < 15; poll++) {
        await pause(1100);
        const headers: Record<string, string> = {};
        const polled = await fetcher(`${base}/submissions/${encodeURIComponent(j.token)}?base64_encoded=true`, { headers, signal: AbortSignal.timeout(25000) });
        if (!polled.ok) { error = runnerMessage(polled.status); break; }
        j = await polled.json();
      }
      if (error) break;
      if ((j.status?.id ?? 3) <= 2) { error = "The code runner is still processing this submission. Please try again shortly."; break; }
      const stdout = decode(j.stdout);
      const stderr = [decode(j.compile_output), decode(j.stderr), decode(j.message)].filter(Boolean).join("\n");
      results.push({ index, input: c.input, expected: c.expected, stdout, stderr, status: j.status?.description ?? "Done", passed: c.expected === null ? null : j.status?.id === 3 && stdout.trim() === c.expected.trim(), time: j.time ?? null });
    } catch { error = "The code runner returned an unreadable response. Please try again."; break; }
  }
  return { ok: error === null, error, results };
}