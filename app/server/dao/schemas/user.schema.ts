import * as v from "valibot";

export const UserSchema = v.object({
  email: v.string(),
  passwordHash: v.string(),
  emailVerified: v.boolean(),
  createdAt: v.date(),
  updatedAt: v.date(),
});

export type UserDocument = v.InferOutput<typeof UserSchema>;
