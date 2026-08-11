import * as v from "valibot";

// Document shape stored in MongoDB
export const TokenSchema = v.object({
  userId: v.string(), // stored as string; convert to ObjectId at DAO boundary
  type: v.picklist(["refresh", "email_verification", "password_reset"]),
  tokenHash: v.string(),
  expiresAt: v.date(),
  createdAt: v.date(),
});

export type TokenDocument = v.InferOutput<typeof TokenSchema>;
export type TokenType = TokenDocument["type"];
