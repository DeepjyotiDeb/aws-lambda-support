import { redirect } from "react-router";
import { createAuthResponse } from "~/server/auth";
import { registerOAuthUser } from "~/server/services/user.service";
import type { Route } from "./+types/callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  // Read state from cookie for CSRF validation
  const cookieHeader = request.headers.get("Cookie");
  const match = cookieHeader?.match(/github_oauth_state=([^;]+)/);
  const savedState = match ? match[1] : null;

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return redirect("/login?error=invalid_github_request");
  }

  // 1. Exchange authorization code for access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error) {
    console.error("GitHub Token Exchange Error:", tokenData);
    return redirect("/login?error=token_exchange_failed");
  }

  // 2. Fetch user profile
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const githubUser = await userResponse.json();

  if (!userResponse.ok) {
    console.error("GitHub User Fetch Error:", githubUser);
    return redirect("/login?error=userinfo_failed");
  }

  // 3. Fetch primary email (GitHub doesn't always expose email in /user)
  let email = githubUser.email;
  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const emails = await emailResponse.json();
    const primary = emails.find((e: { primary: boolean }) => e.primary);
    email = primary?.email || emails[0]?.email;
  }

  if (!email) {
    return redirect("/login?error=no_email");
  }

  // 4. Find or create user in DB
  const userId = await registerOAuthUser(email, "github", String(githubUser.id));

  // 5. Create proper session + refresh token via existing auth system
  const multiSession = process.env.AUTH_ALLOW_MULTI_SESSION !== "false";
  const response = await createAuthResponse(userId, "/", request, multiSession);

  // 6. Clear temporary state cookie
  response.headers.append("Set-Cookie", `github_oauth_state=; Path=/; HttpOnly; Max-Age=0`);

  return response;
}
