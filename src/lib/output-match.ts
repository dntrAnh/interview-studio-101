/** Compares program output to expected output, ignoring line-ending/trailing-space and JSON spacing differences. */
const clean = (s: string) => s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim();
function json(s: string): { ok: boolean; v?: unknown } { try { return { ok: true, v: JSON.parse(s) }; } catch { return { ok: false }; } }
export function outputsMatch(actual: string, expected: string): boolean {
  const a = clean(actual), e = clean(expected);
  if (a === e) return true;
  const ja = json(a), je = json(e);
  return ja.ok && je.ok && JSON.stringify(ja.v) === JSON.stringify(je.v);
}
