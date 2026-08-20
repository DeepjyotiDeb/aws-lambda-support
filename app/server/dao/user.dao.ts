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

  static async createUser(email: string, passwordHash?: string, emailVerified = false) {
    const db = getDb();
    const insertResult = await db.collection<UserDocument>("users").insertOne({
      email,
      ...(passwordHash ? { passwordHash } : {}),
      emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return insertResult.insertedId.toString();
  }

  static async findOrCreateOAuthUser(
    email: string,
    providerField: "googleId" | "githubId",
    providerId: string,
  ): Promise<string> {
    const db = getDb();

    // Try to find existing user by provider ID or email
    const user = await db.collection<UserDocument>("users").findOne({
      $or: [{ [providerField]: providerId }, { email }],
    });

    if (user) {
      // Link provider ID if not already set
      if (!user[providerField]) {
        await db
          .collection<UserDocument>("users")
          .updateOne(
            { _id: user._id },
            { $set: { [providerField]: providerId, emailVerified: true, updatedAt: new Date() } },
          );
      }
      return user._id.toString();
    }

    // Create new user
    const insertResult = await db.collection<UserDocument>("users").insertOne({
      email,
      emailVerified: true,
      [providerField]: providerId,
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

  static async markEmailVerified(userId: string) {
    const db = getDb();
    await db
      .collection<UserDocument>("users")
      .updateOne(
        { _id: new ObjectId(userId) },
        { $set: { emailVerified: true, updatedAt: new Date() } },
      );
  }
}
