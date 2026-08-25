import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Server } from "node:http";
import { MongoClient } from "mongodb";

let server: Server | undefined;
let base = "";

async function pingMongo(): Promise<boolean> {
  const url = "mongodb://localhost:27017";
  try {
    const client = new MongoClient(url, { serverSelectionTimeoutMS: 1500 });
    await client.connect();
    await client.close();
    return true;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  if (!(await pingMongo())) {
    throw new Error("MongoDB is not running. Start it with: docker compose up -d mongo");
  }
  process.env.FAKE_LLM = "1";
  process.env.MONGODB_DB = "lecture-bot-test";
  const { createApp } = await import("../src/app");
  const app = createApp();
  server = app.listen(0) as Server;
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server?.close();
  const { getDb } = await import("../src/db");
  await getDb().then(async (db) => {
    await db.dropDatabase().catch(() => {});
  });
  server = undefined;
});

async function createSession(transcript: string): Promise<string> {
  const res = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transcript, notes: "", title: "t" }),
  });
  expect(res.ok).toBe(true);
  return (await res.json()).id as string;
}

async function ask(id: string, question: string): Promise<{ answer: string }> {
  const res = await fetch(`${base}/api/sessions/${id}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  expect(res.ok).toBe(true);
  return (await res.json()) as { answer: string };
}

describe("session-scoped chat", () => {
  it("builds each answer from the selected session's context only", async () => {
    const idA = await createSession("Biology lecture covering ALPHA-ONLY mitochondria.");
    const idB = await createSession("History lecture covering BETA-ONLY trade routes.");

    const a = await ask(idA, "What did this lecture cover?");
    expect(a.answer).toContain("ALPHA-ONLY");
    expect(a.answer).not.toContain("BETA-ONLY");

    const b = await ask(idB, "What did this lecture cover?");
    expect(b.answer).toContain("BETA-ONLY");
    expect(b.answer).not.toContain("ALPHA-ONLY");
  });

  it("persists the chat on the session that was asked, not elsewhere", async () => {
    const idA = await createSession("Content ALPHA-ONLY.");
    const idB = await createSession("Content BETA-ONLY.");
    await ask(idA, "Question one?");
    await ask(idB, "Question two?");

    const resA = await fetch(`${base}/api/sessions/${idA}`);
    const resB = await fetch(`${base}/api/sessions/${idB}`);
    const a = (await resA.json()).session;
    const b = (await resB.json()).session;

    expect(a.chat.map((m: { content: string }) => m.content)).toContain(
      "Question one?",
    );
    expect(a.chat.map((m: { content: string }) => m.content)).not.toContain(
      "Question two?",
    );
    expect(b.chat.map((m: { content: string }) => m.content)).toContain(
      "Question two?",
    );
  });
});