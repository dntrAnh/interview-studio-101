import { describe, expect, it } from "vitest";
import { getLanguage, withStandardImports } from "@/lib/languages";

describe("standard imports", () => {
  it("provides sys for Python starter code and submitted code", () => {
    expect(getLanguage("python").starter).toContain("import sys\n");
    expect(withStandardImports("print(sys.stdin.read())", "python")).toContain("import sys\n");
  });
  it("keeps future imports ahead of supplied imports", () => {
    const code = withStandardImports('"""Solution."""\nfrom __future__ import annotations\nprint(sys.stdin.read())', "python");
    expect(code.indexOf("from __future__")).toBeLessThan(code.indexOf("import sys"));
  });
  it("does not alter other language programs", () => {
    expect(withStandardImports("console.log(1)", "javascript")).toBe("console.log(1)");
  });
  it("supplies only sys and leaves other imports to the user", () => {
    expect(getLanguage("python").starter.split("\n").filter(line => /^(import |from )/.test(line))).toEqual(["import sys"]);
    expect(withStandardImports("print(1)", "python")).toBe("import sys\n\nprint(1)");
  });
});