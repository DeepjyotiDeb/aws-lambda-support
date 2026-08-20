import { redirect } from "react-router";
import { createAuthResponse } from "~/server/auth";
import { registerOAuthUser } from "~/server/services/user.service";
import type { Route } from "./+types/callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Read PKCE Verifier from incoming cookie
  const cookieHeader = request.headers.get("Cookie");
  const match = cookieHeader?.match(/pkce_verifier=([^;]+)/);
  const verifier = match ? match[1] : null;

  if (!code || !verifier) {
    return redirect("/login?error=invalid_pkce_request");
  }

  // 1. Exchange authorization code + code_verifier for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Token Exchange Error:", tokens);
    return redirect("/login?error=token_exchange_failed");
  }

  // 2. Fetch User Profile using access token
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userProfile = await userResponse.json();

  // 3. Find or create user in DB (Google already verified their email)
  const userId = await registerOAuthUser(userProfile.email, "google", userProfile.id);

  // 4. Create proper session + refresh token via existing auth system
  const multiSession = process.env.AUTH_ALLOW_MULTI_SESSION !== "false";
  const response = await createAuthResponse(userId, "/", request, multiSession);

  // 5. Clear temporary PKCE cookie
  response.headers.append("Set-Cookie", `pkce_verifier=; Path=/; HttpOnly; Max-Age=0`);

  return response;
}
