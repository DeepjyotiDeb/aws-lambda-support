import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

export type User = {
  _id: ObjectId;
  email: string;
  passwordHash?: string;
  googleId?: string;
  githubId?: string;
  emailVerified: boolean;
  createdAt: Date;
};

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
let dbClient: MongoClient | null = null;

export function getDb() {
  if (dbClient) {
    return dbClient.db();
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  dbClient = client;
  return client.db();
}
