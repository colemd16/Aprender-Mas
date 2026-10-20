import { z } from "zod";
import { ERROR_TYPES } from "@/content/error-types";

const errorTypeIds = ERROR_TYPES.map((e) => e.id) as [string, ...string[]];

// The exact shape the model must answer in (enforced by structured outputs).
export const GradingOutput = z.object({
  corrected: z.string(),
  errors: z.array(
    z.object({
      type: z.enum(errorTypeIds),
      wrong: z.string(),
      right: z.string(),
      explanation: z.string(),
      skill_id: z.string().nullable(),
    }),
  ),
  // A remark that isn't a mistake (style, a more common alternative). Never fails an answer.
  tip: z.string().nullable(),
});

export type GradingOutput = z.infer<typeof GradingOutput>;
