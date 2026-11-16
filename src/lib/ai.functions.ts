import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { QuestionData } from "./types";

export type AssistAction = "phrase" | "reformat" | "import" | "hints";

const INSTRUCTIONS: Record<AssistAction, string> = {
  phrase:
    "Improve the wording of this coding interview question so it is clear, precise and unambiguous. Keep the meaning identical. Return the improved description (and title if it can be clearer).",
  reformat:
    "Rewrite this question in the classic coding-interview format used by LeetCode/HackerRank. The description must use these sections in plain text with markdown-style headings: a short problem statement, '### Example 1' (Input / Output / Explanation), more examples if useful, and '### Constraints' as a bullet list. Also set a sensible difficulty and title.",
  import:
    "The user pasted a problem copied from LeetCode, HackerRank or similar. Parse it into the structured fields: title, difficulty (Easy/Medium/Hard), description formatted with '### Example N' and '### Constraints' sections, up to 3 progressive hints, the optimal time/space complexity, and up to 5 test cases. Test cases are stdin/stdout pairs: 'input' is the exact text fed to standard input (one value per line, arrays as space separated numbers), 'expected' is the exact expected stdout.",
  hints:
    "Write 2-4 progressive hints for this question (from gentle nudge to near-solution, never the full code) and state the optimal time and space complexity with a one-line justification.",
};

export const assistQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: AssistAction; question: QuestionData; pasted?: string }) => {
    if (!INSTRUCTIONS[input.action]) throw new Error("Unknown action");
    return input;
  })
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const source =
      data.action === "import"
        ? `Pasted problem:\n${(data.pasted ?? "").slice(0, 20000)}`
        : `Current question JSON:\n${JSON.stringify(data.question).slice(0, 20000)}`;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You help interviewers author coding interview questions. Only include fields you change. Allowed keys: title, difficulty, description, hints (string array), complexity (string), test_cases (array of {input, expected}).",
        input: [
          {
            role: "user",
            content: `${INSTRUCTIONS[data.action]}\n\n${source}\n\nReturn JSON only.`,
          },
        ],
        text: { format: { type: "json_object" } },
      });
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content) if (c.type === "output_text") text += c.text;
        }
      }
      const parsed = JSON.parse(text || "{}") as Partial<QuestionData>;
      return { ok: true as const, patch: parsed };
    } catch (err) {
      if (err instanceof GatewayError) {
        const msg =
          err.code === "payment_required"
            ? "AI credits are used up for this workspace."
            : err.httpStatus === 429
              ? "AI is busy right now, try again in a moment."
              : "The AI assistant could not answer. Please try again.";
        return { ok: false as const, error: msg };
      }
      if (err instanceof SyntaxError) return { ok: false as const, error: "AI returned an unreadable answer. Try again." };
      throw err;
    }
  });
