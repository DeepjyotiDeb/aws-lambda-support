import * as v from "valibot";

export const UserSchema = v.object({
  email: v.string(),
  passwordHash: v.optional(v.string()),
  emailVerified: v.boolean(),
  googleId: v.optional(v.string()),
  githubId: v.optional(v.string()),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export type UserDocument = v.InferOutput<typeof UserSchema>;
