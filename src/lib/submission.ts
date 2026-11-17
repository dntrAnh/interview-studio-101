import { z } from "zod";

export const savedSubmissionSchema = z.object({
  code: z.string(), language: z.string(), submittedAt: z.string(),
  addedTests: z.array(z.object({ input: z.string(), expected: z.string() })),
  results: z.array(z.object({ index: z.number(), input: z.string(), expected: z.string().nullable(), stdout: z.string(), stderr: z.string(), status: z.string(), passed: z.boolean().nullable(), time: z.string().nullable() })),
  error: z.string().nullable(),
});

export const canDeleteSnapshot = (ownerId: string, userId: string) => ownerId === userId;