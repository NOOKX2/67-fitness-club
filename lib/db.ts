import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const dbName = process.env.DB_NAME ?? "test_database";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

function getClient(): MongoClient {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri);
  }
  return global._mongoClient;
}

let dbPromise: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    const client = getClient();
    dbPromise = client.connect().then(() => client.db(dbName));
  }
  return dbPromise;
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection("users").createIndex("email", { unique: true });
  await db.collection("friendships").createIndex("id", { unique: true });
  await db.collection("friendships").createIndex({ requester_id: 1, recipient_id: 1 });
  await db.collection("friend_messages").createIndex("id", { unique: true });
  await db.collection("friend_messages").createIndex({ from_user_id: 1, to_user_id: 1 });
  await db.collection("login_attempts").createIndex("identifier");
  await db
    .collection("password_reset_tokens")
    .createIndex("expires_at", { expireAfterSeconds: 0 });
}
