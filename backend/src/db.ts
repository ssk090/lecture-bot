import { MongoClient, ObjectId, type Db } from "mongodb";

const url = process.env.MONGODB_URL ?? "mongodb://localhost:27017";
let client: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  try {
    if (!client) {
      client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
    }
    const db = client.db(process.env.MONGODB_DB ?? "lecture-bot");
    await db.command({ ping: 1 });
    return db;
  } catch (error) {
    await client?.close(true).catch(() => {});
    client = null;
    throw new Error(
      `MongoDB unavailable at ${url}. Start it with: docker compose up -d mongo`,
      { cause: error },
    );
  }
}

export async function sessions() {
  return (await getDb()).collection("sessions");
}

export function toId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}
