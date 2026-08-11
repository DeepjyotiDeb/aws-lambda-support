import crypto from "crypto";
import { TokenDAO } from "~/server/dao/token.dao";

export type TokenType = "refresh" | "email_verification" | "password_reset";

function getTtlDays(type: TokenType) {
  switch (type) {
    case "refresh":
      return 30;
    case "email_verification":
      return 1;
    case "password_reset":
      return 1 / 24; // 1 hour
  }
}

export async function issueToken(type: TokenType, userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = new Date();

  const days = getTtlDays(type);
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  await TokenDAO.insert({
    userId,
    type,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  return rawToken;
}

export async function validateToken(
  type: TokenType,
  rawToken: string,
): Promise<{ userId: string; expiresAt: Date } | null> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const tokenDoc = await TokenDAO.findByHash(tokenHash, type);
  if (!tokenDoc) return null;

  if (tokenDoc.expiresAt < new Date()) {
    return null; // Expired
  }

  return { userId: tokenDoc.userId.toString(), expiresAt: tokenDoc.expiresAt };
}

export async function consumeToken(type: TokenType, rawToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await TokenDAO.deleteByHash(tokenHash, type);
}

export async function deleteAllUserTokens(userId: string, type: TokenType): Promise<void> {
  await TokenDAO.deleteAllForUser(userId, type);
}

export function daysRemaining(expiresAt: Date): number {
  return (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}
