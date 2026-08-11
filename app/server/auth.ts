import bcrypt from "bcryptjs";
import { redirect } from "react-router";
import { commitSession, destroySession, getSession, refreshCookie } from "./cookie";
import { issueToken, deleteAllUserTokens } from "./services/token.service";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createAuthResponse(
  userId: string,
  redirectTo: string,
  request: Request,
  multiSession: boolean = true,
): Promise<Response> {
  if (!multiSession) {
    await deleteAllUserTokens(userId, "refresh");
  }

  const rawRefreshToken = await issueToken("refresh", userId);
  const session = await getSession(request.headers.get("Cookie"));
  session.set("userId", userId);

  const response = redirect(redirectTo);
  response.headers.append("Set-Cookie", await commitSession(session));
  response.headers.append("Set-Cookie", await refreshCookie.serialize(rawRefreshToken));

  return response;
}

export async function destroyAuth(
  request: Request,
  redirectTo: string,
  userId?: string,
): Promise<Response> {
  if (userId) {
    await deleteAllUserTokens(userId, "refresh");
  }

  const session = await getSession(request.headers.get("Cookie"));
  const response = redirect(redirectTo);
  response.headers.append("Set-Cookie", await destroySession(session));
  response.headers.append("Set-Cookie", await refreshCookie.serialize("", { maxAge: 0 }));

  return response;
}
