import { config as dotenvConfig } from "dotenv";
import cors from "cors";
import express from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  createOpencode,
  createOpencodeClient,
  type Part,
} from "@opencode-ai/sdk";
import { sessions as sessionsCol, toId } from "./db";

dotenvConfig({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), "../.env")],
});

const exec = promisify(execFile);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const SYSTEM_PROMPT = `You are an academic study assistant. Use only the provided transcript unless a term from it needs a brief standard definition. Remove filler and logistics. Preserve lecture context.

Return markdown with:
1. High-Level Summary: 2-3 sentence subject/objective and one key takeaway.
2. Structured Notes: thematic sections with bullets, definitions, formulas, frameworks, mechanisms, examples.
3. High-Yield Points: 4-7 testable ideas, pitfalls, exceptions, nuances.
4. Flashcards: 5-10 Front/Back cards.
5. Practice Quiz: 4-5 mixed questions, then answer key with brief rationales.`;

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
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "transcription failed",
      });
  }
});

async function askOpencode(transcript: string) {
  const model = process.env.OPENCODE_MODEL ?? "opencode-go/deepseek-v4-flash";
  const [providerID, ...modelParts] = model.split("/");
  const modelID = modelParts.join("/");
  const opencode = process.env.OPENCODE_URL
    ? {
        client: createOpencodeClient({
          baseUrl: process.env.OPENCODE_URL,
          throwOnError: true,
        }),
      }
    : await createOpencode({ config: { model } });

  if (process.env.OPENCODE_API_KEY) {
    await opencode.client.auth.set({
      path: { id: providerID },
      body: { type: "api", key: process.env.OPENCODE_API_KEY },
    });
  }

  const session = await opencode.client.session.create({
    body: { title: "Lecture notes" },
  });
  if (!session.data) throw new Error("opencode session creation failed");
  const result = await opencode.client.session.prompt({
    path: { id: session.data.id },
    body: {
      model: modelID ? { providerID, modelID } : undefined,
      system: SYSTEM_PROMPT,
      parts: [{ type: "text", text: transcript }],
    },
  });

  if (!result.data)
    throw new Error(`opencode prompt failed: ${JSON.stringify(result)}`);
  const notes = result.data.parts
    .filter(
      (part: Part): part is Extract<Part, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (!notes)
    throw new Error(
      `opencode returned no text parts: ${result.data.parts.map((part) => part.type).join(", ")}`,
    );
  return notes;
}

app.post("/api/study", async (req, res) => {
  const transcript = String(req.body?.transcript ?? "").trim();
  if (!transcript)
    return res.status(400).json({ error: "transcript required" });
  try {
    res.json({ notes: await askOpencode(transcript) });
  } catch (error) {
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "notes failed" });
  }
});

// ---- session management ----
const STUDY_PACK_DIR =
  process.env.STUDY_PACK_DIR ?? path.join(process.cwd(), "data", "study-packs");

function publicSession(doc: any) {
  return {
    id: String(doc._id),
    title: doc.title,
    transcript: doc.transcript,
    notes: doc.notes ?? "",
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
  if (!transcript)
    return res.status(400).json({ error: "transcript required" });
  try {
    const now = new Date();
    const title =
      String(req.body?.title ?? "").trim() ||
      `Lecture ${now.toISOString().slice(0, 16).replace("T", " ")}`;
    const result = await (await sessionsCol()).insertOne({
      title,
      transcript,
      notes: String(req.body?.notes ?? ""),
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

app.listen(PORT, () => console.log(`server http://localhost:${PORT}`));
