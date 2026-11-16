export type TestCase = { input: string; expected: string };

export type QuestionData = {
  title: string;
  difficulty: string;
  description: string;
  hints: string[];
  complexity: string;
  starter_code: Record<string, string>;
  test_cases: TestCase[];
};

export type TimerState = {
  kind: "stopwatch" | "countdown";
  running: boolean;
  startedAt: number | null; // epoch ms when last started
  accumulatedMs: number; // elapsed before last start
  durationMs: number; // countdown length
};

export type RunResult = {
  index: number;
  input: string;
  expected: string | null;
  stdout: string;
  stderr: string;
  status: string;
  passed: boolean | null;
  time: string | null;
};

export const emptyQuestion = (): QuestionData => ({
  title: "",
  difficulty: "Medium",
  description: "",
  hints: [],
  complexity: "",
  starter_code: {},
  test_cases: [],
});

export function elapsedMs(t: TimerState, now = Date.now()) {
  return t.accumulatedMs + (t.running && t.startedAt ? now - t.startedAt : 0);
}

export function formatMs(ms: number) {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${neg ? "-" : ""}${h > 0 ? `${h}:` : ""}${pad(m)}:${pad(s)}`;
}
