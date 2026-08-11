import { ObjectId } from "mongodb";
import { getDb } from "~/server/db";
import type { TokenDocument, TokenType } from "./schemas/token.schema";

export class TokenDAO {
  static async insert(doc: TokenDocument): Promise<void> {
    const db = getDb();
    await db.collection("tokens").insertOne({
      ...doc,
      userId: new ObjectId(doc.userId), // ObjectId conversion at the DAO boundary
    });
  }

  static async findByHash(tokenHash: string, type: TokenType): Promise<TokenDocument | null> {
    const db = getDb();
    const raw = await db
      .collection<TokenDocument>("tokens")
      .findOne({ tokenHash, type }, { projection: { _id: 0 } });
    if (!raw) return null;
    return { ...raw, userId: raw.userId.toString() };
  }

  static async findOneAndDeleteByHash(
    tokenHash: string,
    type: TokenType,
  ): Promise<TokenDocument | null> {
    const db = getDb();
    const raw = await db
      .collection<TokenDocument>("tokens")
      .findOneAndDelete({ tokenHash, type }, { projection: { _id: 0 } });
    if (!raw) return null;
    return { ...raw, userId: raw.userId.toString() };
  }

  static async deleteByHash(tokenHash: string, type: TokenType): Promise<void> {
    const db = getDb();
    await db.collection("tokens").deleteOne({ tokenHash, type });
  }

  static async deleteAllForUser(userId: string, type: TokenType): Promise<void> {
    const db = getDb();
    await db.collection("tokens").deleteMany({ userId: new ObjectId(userId), type });
  }
}
