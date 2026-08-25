import { Router, type Response } from "express";
import { sessions as sessionsCol, toId } from "../db";
import {
  CHAT_SYSTEM,
  CHAT_TIMEOUT_MS,
  askLlm,
  streamLlm,
} from "../llm";
import { buildChatContext, persistChatTurn } from "../chat";

const router = Router();

/** Shared SSE plumbing for chat answers. appendUser controls whether a new
 *  user turn is added (ask) or the existing last user turn is reused (regenerate). */
async function streamChatAnswer(
  doc: any,
  question: string,
  res: Response,
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
    const chat = await persistChatTurn(doc._id, [
      ...next,
      { role: "assistant", content: full, createdAt: new Date() },
    ]);
    res.write(`data: ${JSON.stringify({ done: true, chat })}\n\n`);
    res.end();
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "chat failed" })}\n\n`,
    );
    res.end();
  }
}

// streaming chat: new question (mode=ask) or re-answer last question (mode=regenerate)
router.post("/sessions/:id/chat/stream", async (req, res) => {
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
router.post("/sessions/:id/chat", async (req, res) => {
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
    const chat = await persistChatTurn(doc._id, [
      ...(doc.chat ?? []),
      { role: "user", content: question, createdAt: new Date() },
      { role: "assistant", content: answer, createdAt: new Date() },
    ]);
    res.json({ answer, chat });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "chat failed",
    });
  }
});

export const chatRouter = router;