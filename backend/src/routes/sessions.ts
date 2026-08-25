import { Router } from "express";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { sessions as sessionsCol, toId } from "../db";
import { capChat } from "../llm";

const router = Router();
const MAX_NOTES_CHARS = 500_000;

function studyPackDir() {
  return process.env.STUDY_PACK_DIR ?? path.join(process.cwd(), "data", "study-packs");
}

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

router.get("/sessions", async (_req, res) => {
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

router.get("/sessions/:id", async (req, res) => {
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

router.post("/sessions", async (req, res) => {
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

router.patch("/sessions/:id", async (req, res) => {
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

router.delete("/sessions/:id", async (req, res) => {
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
router.post("/sessions/:id/export", async (req, res) => {
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

    await mkdir(studyPackDir(), { recursive: true });
    const slug = doc.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const file = path.join(studyPackDir(), `${slug || "session"}-${id}.md`);
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

export const sessionsRouter = router;