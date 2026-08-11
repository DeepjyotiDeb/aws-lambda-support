import { RateLimitDAO } from "~/server/dao/rateLimit.dao";

export async function checkRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `${ip}:${route}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const result = await RateLimitDAO.increment(key, expiresAt);
  if (!result) return false; // Should not happen, but just in case

  // Clean up if expired
  if (result.expiresAt < now) {
    await RateLimitDAO.reset(key);
    return true;
  }

  return result.count <= limit;
}
