import crypto from "node:crypto";

// Generate high-entropy random string
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// SHA-256 hash formatted as base64url
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Buffer.from(digest).toString("base64url");
}
