import crypto from "node:crypto";
import { redirect } from "react-router";

export async function action() {
  // Generate a random state value for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    scope: "read:user user:email",
    state,
  });

  // Store state in a temporary cookie for validation in the callback
  return redirect(`https://github.com/login/oauth/authorize?${params}`, {
    headers: {
      "Set-Cookie": `github_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300; Secure`,
    },
  });
}
