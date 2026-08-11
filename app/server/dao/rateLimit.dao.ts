import type { RateLimitDocument } from "~/server/dao/schemas/rateLimit.schema";
import { getDb } from "~/server/db";

export class RateLimitDAO {
  static async increment(
    key: string,
    expiresAt: Date,
  ): Promise<{ count: number; expiresAt: Date } | null> {
    const db = getDb();
    const result = await db.collection<RateLimitDocument>("rate_limits").findOneAndUpdate(
      { ipId: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt },
      },
      { upsert: true, returnDocument: "after" },
    );
    return result && result.count ? { count: result.count, expiresAt: result.expiresAt } : null;
  }

  static async reset(key: string): Promise<void> {
    const db = getDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000); // 1 hour window
    await db.collection("rate_limits").updateOne({ ipId: key }, { $set: { count: 1, expiresAt } });
  }
}
