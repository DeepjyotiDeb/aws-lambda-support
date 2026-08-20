import { redirect } from "react-router";
import { generateCodeChallenge, generateCodeVerifier } from "~/server/utils/pkce";

export async function action() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  // Store the verifier in a temporary short-lived cookie for validation in the callback
  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, {
    headers: {
      "Set-Cookie": `pkce_verifier=${verifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300; Secure`,
    },
  });
}
