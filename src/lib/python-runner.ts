import { outputsMatch } from "./output-match";
import type { RunResult, TestCase } from "./types";

type Raw = { stdout: string; stderr: string; ok: boolean; time: string };
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (d: any) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => { pending.get(e.data.id)?.(e.data); pending.delete(e.data.id); };
  }
  return worker;
}
function reset() { worker?.terminate(); worker = null; pending.forEach((r) => r({ ok: false, error: "terminated" })); pending.clear(); }
function call(msg: object, timeoutMs: number) {
  return new Promise<any>((resolve) => {
    const id = ++seq;
    const t = setTimeout(() => { pending.delete(id); reset(); resolve({ ok: false, timeout: true }); }, timeoutMs);
    pending.set(id, (d) => { clearTimeout(t); resolve(d); });
    getWorker().postMessage({ id, ...msg });
  });
}

/** Starts downloading Python in the background so the first Run is instant. */
export function warmPython() { if (typeof window !== "undefined") void call({ type: "warm" }, 120_000); }

export function toRunResults(cases: { input: string; expected: string | null }[], raw: Raw[]): RunResult[] {
  return raw.map((r, index) => {
    const c = cases[index]!;
    return { index, input: c.input, expected: c.expected, stdout: r.stdout, stderr: r.stderr,
      status: r.ok ? "Accepted" : "Runtime Error", time: r.time,
      passed: c.expected === null ? null : r.ok && outputsMatch(r.stdout, c.expected) };
  });
}

export async function runPythonLocally(code: string, tests: TestCase[], customInput?: string) {
  const cases = tests.length ? tests : [{ input: customInput ?? "", expected: null }];
  await call({ type: "warm" }, 120_000); // loading is not counted against the time limit
  const res = await call({ type: "run", code, inputs: cases.map((c) => c.input) }, 5000 + cases.length * 2000);
  if (res.timeout) return { ok: false, error: "Time limit exceeded — check for an infinite loop.", results: [] as RunResult[] };
  if (!res.ok) return { ok: false, error: `Python could not start: ${res.error}`, results: [] as RunResult[] };
  return { ok: true, error: null, results: toRunResults(cases, res.results) };
}
