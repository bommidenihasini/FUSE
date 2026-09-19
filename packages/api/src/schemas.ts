import { z } from "zod";

export const scenarioSchema = z.enum([
  "invoice-verification-loop",
  "safe-completion",
  "bounded-tool-error",
]);

export const createRunBodySchema = z.object({
  scenario: scenarioSchema,
  policyId: z.string().min(1).max(128),
});

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const runIdSchema = z.string().min(1).max(128);

export type CreateRunBody = z.infer<typeof createRunBodySchema>;
