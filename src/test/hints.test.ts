import { describe, expect, it } from "vitest";
import { hintLines, showsProgressiveHints, visibleHints } from "@/lib/hints";

describe("hintLines", () => {
  it("splits a multi-line hint entry into ordered lines", () => {
    expect(hintLines(["think about a hash map\nstore each index as you go"])).toEqual([
      "think about a hash map",
      "store each index as you go",
    ]);
  });

  it("drops blank lines and trims each line", () => {
    expect(hintLines(["  first\r\n\r\n   second  ", "\n"])).toEqual(["first", "second"]);
  });

  it("returns one line for a single-line hint", () => {
    expect(hintLines(["just sort the array"])).toEqual(["just sort the array"]);
  });

  it("returns nothing when the question has no hints", () => {
    expect(hintLines([])).toEqual([]);
    expect(hintLines(undefined)).toEqual([]);
    expect(hintLines(["", "   "])).toEqual([]);
  });
});

describe("visibleHints", () => {
  const lines = ["first", "second", "third"];

  it("shows nothing before the first reveal", () => {
    expect(visibleHints(lines, 0)).toEqual([]);
  });

  it("reveals one more line per click, in order", () => {
    expect(visibleHints(lines, 1)).toEqual(["first"]);
    expect(visibleHints(lines, 2)).toEqual(["first", "second"]);
  });

  it("never reveals more than exists", () => {
    expect(visibleHints(lines, 9)).toEqual(lines);
    expect(visibleHints(lines, -1)).toEqual([]);
  });

  it("reveals a single-line hint in one click", () => {
    expect(visibleHints(["only one"], 1)).toEqual(["only one"]);
  });
});

describe("showsProgressiveHints", () => {
  it("applies to solo practice rooms", () => {
    expect(showsProgressiveHints("solo")).toBe(true);
  });

  it("never applies to mock interview rooms", () => {
    expect(showsProgressiveHints("mock")).toBe(false);
  });
});
