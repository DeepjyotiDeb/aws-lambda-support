import { redirect } from "react-router";
import { getSession, commitSession, refreshCookie } from "~/server/cookie";
import { issueToken, consumeAndValidateToken } from "~/server/services/token.service";
import { userContext, authFlagsContext, getAuthFlagsFromEnv } from "~/context";
import { getUserDetails } from "~/server/services/user.service";

const PUBLIC_ALLOWLIST = [
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
  "/auth/google",
  "/auth/github",
];

export async function authMiddleware({ request, context }: any, next: () => Promise<Response>) {
  const url = new URL(request.url);

  context.set(authFlagsContext, getAuthFlagsFromEnv());

  // Public routes skip auth check
  if (PUBLIC_ALLOWLIST.some((p) => url.pathname.startsWith(p))) {
    context.set(userContext, null);
    return next();
  }

  const cookieHeader = request.headers.get("Cookie");
  const session = await getSession(cookieHeader);

  let userId = session.get("userId");
  let newSessionIssued = false;
  let newRefreshTokenIssued = false;
  let newRawRefresh: string | null = null;

  // 1. Check __session
  if (!userId) {
    // 2. On miss: atomically consume refresh token to prevent concurrent reuse
    const rawRefresh = await refreshCookie.parse(cookieHeader);
    if (!rawRefresh) {
      throw redirect("/login");
    }

    const validated = await consumeAndValidateToken("refresh", rawRefresh);
    if (!validated) {
      throw redirect("/login");
    }

    userId = validated.userId;
    session.set("userId", userId);
    newSessionIssued = true;
    // Always reissue after consuming — token is already deleted from DB
    newRawRefresh = await issueToken("refresh", userId);
    newRefreshTokenIssued = true;
  }

  // 3. Fetch user
  const user = await getUserDetails(userId);
  if (!user) {
    throw redirect("/login");
  }

  // Set user in React Router context using context.set()
  context.set(userContext, user);

  // 5. Call next()
  const response = await next();

  // 6. Append Set-Cookie if tokens were rotated
  if (newSessionIssued) {
    response.headers.append("Set-Cookie", await commitSession(session));
  }
  if (newRefreshTokenIssued && newRawRefresh) {
    response.headers.append("Set-Cookie", await refreshCookie.serialize(newRawRefresh));
  }

  // 7. Prevent CF caching
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}
