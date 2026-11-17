import { describe, expect, it, vi } from "vitest";
import { DIRECT_CE, executeTests, runnerMessage } from "@/lib/judge0.server";

describe("runner", () => {
  it("uses direct CE without an API key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ stdout: btoa("5\n"), status: { id: 3 } })));
    const r = await executeTests({ code: "print(5)", languageId: 71, tests: [{ input: "", expected: "5" }], fetcher });
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${DIRECT_CE}/submissions?base64_encoded=true&wait=true`);
    expect(fetcher.mock.calls[0]?.[1].headers["X-RapidAPI-Key"]).toBeUndefined();
    expect(r.results[0]?.passed).toBe(true);
  });
  it("executes sequentially with pacing between submissions", async () => {
    const events: string[] = [];
    const fetcher = vi.fn(async () => { events.push("submit"); return new Response(JSON.stringify({ stdout: btoa("5"), status: { id: 3 } })); });
    await executeTests({ code: "print(5)", languageId: 71, tests: [{ input: "a", expected: "5" }, { input: "b", expected: "5" }], fetcher, pause: async ms => { events.push(`pause:${ms}`); } });
    expect(events).toEqual(["submit", "pause:1100", "submit"]);
  });
  it("falls back only after direct service failure", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("unavailable", { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ stdout: btoa("5"), status: { id: 3 } })));
    const r = await executeTests({ code: "print(5)", languageId: 71, tests: [], key: "test-key", fetcher, pause: async () => {} });
    expect(fetcher.mock.calls[1]?.[0]).toContain("judge0-ce.p.rapidapi.com");
    expect(r.ok).toBe(true);
  });
  it("does not mark runtime errors passing when expected output is empty", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ stdout: "", status: { id: 11 } })));
    const r = await executeTests({ code: "bad", languageId: 71, tests: [{ input: "", expected: "" }], fetcher });
    expect(r.results[0]?.passed).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("identifies subscription errors and rate limits", () => {
    expect(runnerMessage(403, '{"message":"You are not subscribed"}', true)).toContain("Not subscribed");
    expect(runnerMessage(429, "", false)).toContain("Rate limit exceeded");
  });
});