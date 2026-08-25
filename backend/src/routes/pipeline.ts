import { Router } from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Response } from "express";
import {
  STUDY_TIMEOUT_MS,
  TITLE_SYSTEM,
  askLlm,
  generateStudyDoc,
  generateStudyDocStream,
} from "../llm";

const exec = promisify(execFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

const MAX_TRANSCRIPT_CHARS = 500_000;

const router = Router();

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

router.post("/transcribe", upload.single("audio"), async (req, res) => {
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

router.post("/study", async (req, res) => {
  const transcript = String(req.body?.transcript ?? "").trim();
  if (!transcript) return res.status(400).json({ error: "transcript required" });
  if (transcript.length > MAX_TRANSCRIPT_CHARS)
    return res
      .status(413)
      .json({ error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS} chars)` });
  try {
    res.json({ notes: await generateStudyDoc(transcript, STUDY_TIMEOUT_MS) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "notes failed",
    });
  }
});

// Same generation, but streamed: chunked transcript, continuous single document.
export async function handleStudyStream(transcript: string, res: Response) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const write = (data: string) => {
    if (res.destroyed || res.writableEnded) return;
    res.write(data);
  };
  const end = () => {
    if (!res.destroyed && !res.writableEnded) res.end();
  };
  try {
    for await (const event of generateStudyDocStream(transcript, STUDY_TIMEOUT_MS, controller.signal)) {
      if (event.kind === 'progress') {
        write(
          `data: ${JSON.stringify({ progress: { index: event.index, total: event.total } })}\n\n`,
        );
      } else if (event.kind === 'delta') {
        write(`data: ${JSON.stringify({ delta: event.text })}\n\n`);
      } else {
        write(`data: ${JSON.stringify({ merged: event.document })}\n\n`);
      }
    }
    write(`data: ${JSON.stringify({ done: true })}\n\n`);
    end();
  } catch (error) {
    write(
      `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "study pack failed" })}\n\n`,
    );
    end();
  }
}

router.post("/study/stream", async (req, res) => {
  const transcript = String(req.body?.transcript ?? "").trim();
  if (!transcript)
    return res.status(400).json({ error: "transcript required" });
  if (transcript.length > MAX_TRANSCRIPT_CHARS)
    return res
      .status(413)
      .json({ error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS} chars)` });
  await handleStudyStream(transcript, res);
});

router.post("/title", async (req, res) => {
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
    res.status(500).json({
      error: error instanceof Error ? error.message : "title failed",
    });
  }
});

export const pipelineRouter = router;