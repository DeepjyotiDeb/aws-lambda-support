import type { RateLimitDocument } from "~/server/dao/schemas/rateLimit.schema";
import { getDb } from "~/server/db";

export class RateLimitDAO {
  static async increment(
    key: string,
    expiresAt: Date,
  ): Promise<{ count: number; expiresAt: Date } | null> {
    const db = getDb();
    const now = new Date();
    // Pipeline update atomically resets the window if expired, otherwise increments
    const result = await db.collection<RateLimitDocument>("rate_limits").findOneAndUpdate(
      { ipId: key },
      [
        {
          $set: {
            count: {
              $cond: { if: { $gt: ["$expiresAt", now] }, then: { $add: ["$count", 1] }, else: 1 },
            },
            expiresAt: {
              $cond: { if: { $gt: ["$expiresAt", now] }, then: "$expiresAt", else: expiresAt },
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after" },
    );
    return result ? { count: result.count, expiresAt: result.expiresAt } : null;
  }
}
