// Hint presentation rules for the solo practice room.
// Question hints are stored as a string array; each entry may itself carry
// several lines. Candidates reveal them one line at a time, in order.

/** Flatten stored hint entries into the ordered lines a candidate reveals. */
export function hintLines(hints: string[] | undefined | null): string[] {
  if (!hints) return [];
  return hints
    .flatMap((h) => String(h).split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** The hint lines currently shown, given how many the candidate has revealed. */
export function visibleHints(lines: string[], revealed: number): string[] {
  const count = Math.max(0, Math.min(revealed, lines.length));
  return lines.slice(0, count);
}

/** Whether the room shows progressive hints (solo practice) or the interviewer toggle (mock). */
export function showsProgressiveHints(mode: string): boolean {
  return mode !== "mock";
}
