import { describe, it, expect } from "vitest";
import { outputsMatch } from "@/lib/output-match";
describe("outputsMatch", () => {
  it("accepts JSON with different spacing", () => expect(outputsMatch('[["Delta", 50], ["Gamma", 125]]', '[["Delta",50],["Gamma",125]]')).toBe(true));
  it("ignores CRLF and trailing spaces", () => expect(outputsMatch("1 \r\n2\r\n", "1\n2")).toBe(true));
  it("rejects different values", () => expect(outputsMatch("[1,3]", "[1,2]")).toBe(false));
});
