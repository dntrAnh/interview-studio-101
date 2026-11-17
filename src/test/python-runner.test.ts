import { describe, expect, it } from "vitest";
import { toRunResults } from "@/lib/python-runner";

describe("local python results", () => {
  it("passes only when run succeeds and trimmed output matches", () => {
    const r = toRunResults([{ input: "1", expected: "2" }, { input: "1", expected: "2" }, { input: "", expected: null }],
      [{ stdout: "2\n", stderr: "", ok: true, time: "0.001" }, { stdout: "2", stderr: "x", ok: false, time: "0" }, { stdout: "hi", stderr: "", ok: true, time: "0" }]);
    expect(r.map((x) => x.passed)).toEqual([true, false, null]);
    expect(r[1]!.status).toBe("Runtime Error");
  });
});
