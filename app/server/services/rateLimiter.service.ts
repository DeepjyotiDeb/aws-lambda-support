import { RateLimitDAO } from "~/server/dao/rateLimit.dao";

export async function checkRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `${ip}:${route}`;
  const expiresAt = new Date(Date.now() + windowSeconds * 1000);
  const result = await RateLimitDAO.increment(key, expiresAt);
  if (!result) return false;
  return result.count <= limit;
}
