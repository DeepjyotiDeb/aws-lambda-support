import * as v from "valibot";

export const RateLimitSchema = v.object({
  ipId: v.string(),
  count: v.number(),
  expiresAt: v.date(),
});

export type RateLimitDocument = v.InferOutput<typeof RateLimitSchema>;
