import { ObjectId } from "mongodb";
import type { UserDocument } from "~/server/dao/schemas/user.schema";
import { getDb } from "~/server/db";

export class UserDao {
  static async findById(userId: string) {
    const db = getDb();
    const user = await db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userId) });
    return user;
  }

  static async findByEmail(email: string) {
    const db = getDb();
    const user = await db.collection<UserDocument>("users").findOne({ email: email });
    return user;
  }

  static async createUser(email: string, passwordHash: string, emailVerified: boolean) {
    const db = getDb();
    const insertResult = await db.collection<UserDocument>("users").insertOne({
      email,
      passwordHash,
      emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return insertResult.insertedId.toString();
  }

  static async updatePassword(userId: string, passwordHash: string) {
    const db = getDb();
    await db
      .collection<UserDocument>("users")
      .updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash, updatedAt: new Date() } });
  }
}
