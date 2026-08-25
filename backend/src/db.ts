import { MongoClient, type Db, type ObjectId } from "mongodb";

const url = process.env.MONGODB_URL ?? "mongodb://localhost:27017";
let client: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(url);
    await client.connect();
  }
  return client.db(process.env.MONGODB_DB ?? "lecture-bot");
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
