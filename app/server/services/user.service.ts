import { UserDao } from "~/server/dao/user.dao";
import { hashPassword, verifyPassword } from "~/server/auth";
import {
  consumeToken,
  deleteAllUserTokens,
  issueToken,
  validateToken,
} from "~/server/services/token.service";
import { sendEmail } from "~/server/email";

type RegisterResult =
  | { status: "created"; userId: string }
  | { status: "verification_sent" }
  | { status: "email_exists" };

export async function getUserDetails(userId: string) {
  const user = await UserDao.findById(userId);
  if (!user) return null;
  return {
    userId: user._id.toString(),
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function registerUser(
  email: string,
  password: string,
  verifyOrigin: string,
): Promise<RegisterResult> {
  const requiresVerification = process.env.AUTH_ENABLE_EMAIL_VERIFICATION === "true";
  const existing = await UserDao.findByEmail(email);

  if (existing) {
    // Silent success prevents email enumeration when verification is on
    return requiresVerification ? { status: "verification_sent" } : { status: "email_exists" };
  }

  const passwordHash = await hashPassword(password);
  const userId = await UserDao.createUser(email, passwordHash, !requiresVerification);

  if (requiresVerification) {
    const token = await issueToken("email_verification", userId);
    const verifyLink = `${verifyOrigin}/verify-email?token=${token}`;
    await sendEmail(
      email,
      "Verify your email",
      `Click <a href="${verifyLink}">here</a> to verify your email address.`,
    );
    return { status: "verification_sent" };
  }

  return { status: "created", userId };
}

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<{ userId: string } | null> {
  const user = await UserDao.findByEmail(email);
  if (!user || !user.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return { userId: (user as any)._id.toString() };
}

export async function processEmailVerificationToken(token: string) {
  const validated = await validateToken("email_verification", token);
  if (!validated) {
    return { error: "Invalid or expired verification link." };
  }
  const user = await UserDao.findById(validated.userId);
  if (!user) {
    return { error: "User not found." };
  }

  await UserDao.markEmailVerified(validated.userId);

  await consumeToken("email_verification", token);
  return { success: true };
}

export async function sendPasswordResetEmail(email: string, requestUrl: string): Promise<void> {
  const user = await UserDao.findByEmail(email);

  if (user) {
    const token = await issueToken("password_reset", user._id.toString());
    const origin = new URL(requestUrl).origin;
    const resetLink = `${origin}/reset-password/confirm?token=${token}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `Click <a href="${resetLink}">here</a> to reset your password.`,
    );
  }
}

export async function resetUserPassword(token: string, newPassword: string) {
  const validated = await validateToken("password_reset", token);
  if (!validated) {
    return { error: "Invalid or expired reset link." };
  }

  await consumeToken("password_reset", token);

  await UserDao.updatePassword(validated.userId, newPassword);

  await deleteAllUserTokens(validated.userId, "refresh");

  return { success: true, userId: validated.userId };
}
