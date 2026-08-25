import { config as dotenvConfig } from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { sessions as sessionsCol, toId } from "./db";
import {
  CHAT_SYSTEM,
  CHAT_TIMEOUT_MS,
  MAX_CONTEXT_CHARS,
  STUDY_TIMEOUT_MS,
  SYSTEM_PROMPT,
  TITLE_SYSTEM,
  askLlm,
  capChat,
  streamLlm,
} from "./llm";

dotenvConfig({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), "../.env")],
});

const exec = promisify(execFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

const MAX_TRANSCRIPT_CHARS = 500_000;
const MAX_NOTES_CHARS = 500_000;

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  async function transcribe(buffer: Buffer, originalName: string) {
    const dir = await mkdtemp(path.join(tmpdir(), "lecture-bot-"));
    const input = path.join(dir, originalName || "audio.webm");
    const output = path.join(dir, "audio.txt");
    try {
      await writeFile(input, buffer);
      const cmd = process.env.PARAKEET_CMD ?? "parakeet-mlx";
      const args = (
        process.env.PARAKEET_ARGS ??
        "--output-dir {dir} --output-format txt {input}"
      )
        .replace("{input}", input)
        .replace("{output}", output)
        .replace("{dir}", dir)
        .split(" ")
        .filter(Boolean);
      const { stdout } = await exec(cmd, args, { timeout: 30 * 60 * 1000 });
      try {
        return await readFile(output, "utf8");
      } catch {
        return stdout;
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "audio file required" });
    try {
      res.json({
        transcript: await transcribe(req.file.buffer, req.file.originalname),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "transcription failed",
      });
    }
  });

  app.post("/api/study", async (req, res) => {
    const transcript = String(req.body?.transcript ?? "").trim();
    if (!transcript)
      return res.status(400).json({ error: "transcript required" });
    if (transcript.length > MAX_TRANSCRIPT_CHARS)
      return res
        .status(413)
        .json({ error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS} chars)` });
    try {
      res.json({ notes: await askLlm(transcript, SYSTEM_PROMPT, STUDY_TIMEOUT_MS) });
    } catch (error) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "notes failed" });
    }
  });

  app.post("/api/title", async (req, res) => {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.json({ title: "New session" });
    try {
      const title = await askLlm(text.slice(0, 4000), TITLE_SYSTEM, 60_000);
      res.json({
        title:
          title.split("\n")[0].replace(/^['"]|['".]$/g, "").slice(0, 80) ||
          "New session",
      });
    } catch (error) {
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : "title failed" });
    }
  });

  // ---- session management ----
  const STUDY_PACK_DIR =
    process.env.STUDY_PACK_DIR ??
    path.join(process.cwd(), "data", "study-packs");

  function publicSession(doc: any) {
    return {
      id: String(doc._id),
      title: doc.title,
      transcript: doc.transcript,
      notes: doc.notes ?? "",
      chat: doc.chat ?? [],
      studyPackPath: doc.studyPackPath ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  app.get("/api/sessions", async (_req, res) => {
    try {
      const docs = await (await sessionsCol())
        .find()
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      res.json({ sessions: docs.map(publicSession) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to list sessions",
      });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    try {
      const doc = await (await sessionsCol()).findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: "session not found" });
      res.json({ session: publicSession(doc) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to load session",
      });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    const transcript = String(req.body?.transcript ?? "").trim();
    try {
      const now = new Date();
      const title = String(req.body?.title ?? "").trim() || "New session";
      const result = await (await sessionsCol()).insertOne({
        title,
        transcript,
        notes: String(req.body?.notes ?? ""),
        chat: [],
        createdAt: now,
        updatedAt: now,
      });
      res.json({ id: String(result.insertedId) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to create session",
      });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body?.transcript !== undefined)
      update.transcript = String(req.body.transcript);
    if (req.body?.notes !== undefined) update.notes = String(req.body.notes);
    if (req.body?.title !== undefined) update.title = String(req.body.title);
    if (req.body?.chat !== undefined) {
      if (!Array.isArray(req.body.chat))
        return res.status(400).json({ error: "chat must be an array" });
      update.chat = capChat(req.body.chat);
    }
    try {
      const result = await (await sessionsCol()).findOneAndUpdate(
        { _id: id },
        { $set: update },
        { returnDocument: "after" },
      );
      if (!result) return res.status(404).json({ error: "session not found" });
      res.json({ session: publicSession(result) });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to update session",
      });
    }
  });

  /** Conversation context = transcript + notes + recent chat, size-capped. */
  function buildChatContext(doc: any) {
    const recent = (doc.chat ?? []).slice(-6);
    const history = recent
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");
    const context = [
      `Transcript:\n${doc.transcript ?? ""}`,
      `Study pack:\n${doc.notes ?? ""}`,
      history ? `Recent conversation:\n${history}` : "",
    ]
      .join("\n\n")
      .trim();
    if (context.length > MAX_CONTEXT_CHARS) {
      return `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated]`;
    }
    return context;
  }

  /** Shared SSE plumbing for chat answers. appendUser controls whether a new
   *  user turn is added (ask) or the existing last user turn is reused (regenerate). */
  async function streamChatAnswer(
    doc: any,
    question: string,
    res: express.Response,
    appendUser: boolean,
  ) {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const context = buildChatContext(doc);
    if (!context) {
      res.write(
        `data: ${JSON.stringify({ error: "selected session has no transcript or notes" })}\n\n`,
      );
      res.end();
      return;
    }
    let full = "";
    try {
      for await (const chunk of streamLlm(
        `${context}\n\nQuestion:\n${question}`,
        CHAT_SYSTEM,
        CHAT_TIMEOUT_MS,
      )) {
        full += chunk;
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      if (!full.trim()) throw new Error("no answer generated");
      const next = appendUser
        ? [
            ...(doc.chat ?? []),
            { role: "user", content: question, createdAt: new Date() },
          ]
        : [...(doc.chat ?? [])];
      const messages = capChat([
        ...next,
        { role: "assistant", content: full, createdAt: new Date() },
      ]);
      await (await sessionsCol()).updateOne(
        { _id: doc._id },
        { $set: { chat: messages, updatedAt: new Date() } },
      );
      res.write(`data: ${JSON.stringify({ done: true, chat: messages })}\n\n`);
      res.end();
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "chat failed" })}\n\n`,
      );
      res.end();
    }
  }

  // streaming chat: new question (mode=ask) or re-answer last question (mode=regenerate)
  app.post("/api/sessions/:id/chat/stream", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    const question = String(req.body?.question ?? "").trim();
    if (!question) return res.status(400).json({ error: "question required" });
    const mode = req.body?.mode === "regenerate" ? "regenerate" : "ask";
    try {
      const col = await sessionsCol();
      const doc = await col.findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: "session not found" });

      let working = doc;
      if (mode === "regenerate") {
        // drop the trailing assistant reply so the answer gets replaced
        const chat = doc.chat ?? [];
        if (chat.length && chat[chat.length - 1].role === "assistant") {
          const trimmed = chat.slice(0, -1);
          await col.updateOne(
            { _id: id },
            { $set: { chat: trimmed, updatedAt: new Date() } },
          );
          working = { ...doc, chat: trimmed };
        }
      }
      await streamChatAnswer(working, question, res, mode === "ask");
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to start chat",
      });
    }
  });

  // JSON chat (used by tests and simple clients)
  app.post("/api/sessions/:id/chat", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    const question = String(req.body?.question ?? "").trim();
    if (!question) return res.status(400).json({ error: "question required" });
    try {
      const col = await sessionsCol();
      const doc = await col.findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: "session not found" });
      const context = buildChatContext(doc);
      if (!context)
        return res
          .status(400)
          .json({ error: "selected session has no transcript or notes" });
      const answer = await askLlm(
        `${context}\n\nQuestion:\n${question}`,
        CHAT_SYSTEM,
        CHAT_TIMEOUT_MS,
      );
      const messages = capChat([
        ...(doc.chat ?? []),
        { role: "user", content: question, createdAt: new Date() },
        { role: "assistant", content: answer, createdAt: new Date() },
      ]);
      await col.updateOne(
        { _id: id },
        { $set: { chat: messages, updatedAt: new Date() } },
      );
      res.json({ answer, chat: messages });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "chat failed",
      });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    try {
      const doc = await (await sessionsCol()).findOneAndDelete({ _id: id });
      if (!doc) return res.status(404).json({ error: "session not found" });
      if (doc.studyPackPath) {
        await rm(doc.studyPackPath, { force: true });
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to delete session",
      });
    }
  });

  // write the study pack markdown to the volume and remember where it went
  app.post("/api/sessions/:id/export", async (req, res) => {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid session id" });
    try {
      const col = await sessionsCol();
      const doc = await col.findOne({ _id: id });
      if (!doc) return res.status(404).json({ error: "session not found" });
      const notes = String(req.body?.notes ?? doc.notes ?? "").trim();
      if (!notes) return res.status(400).json({ error: "nothing to save" });
      if (notes.length > MAX_NOTES_CHARS)
        return res
          .status(413)
          .json({ error: `notes too long (max ${MAX_NOTES_CHARS} chars)` });

      await mkdir(STUDY_PACK_DIR, { recursive: true });
      const slug = doc.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const file = path.join(STUDY_PACK_DIR, `${slug || "session"}-${id}.md`);
      await writeFile(file, notes, "utf8");
      await col.updateOne(
        { _id: id },
        { $set: { studyPackPath: file, notes, updatedAt: new Date() } },
      );
      res.json({ path: file });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "failed to save study pack",
      });
    }
  });

  return app;
}