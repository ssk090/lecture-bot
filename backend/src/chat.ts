import type { ObjectId } from "mongodb";
import { sessions as sessionsCol } from "./db";
import { MAX_CONTEXT_CHARS, capChat } from "./llm";

/** Conversation context = study pack + transcript + recent chat, size-capped.
 *  The study pack is the distilled summary of the whole transcript and must
 *  never be truncated away by a long raw transcript, so it is built first and
 *  only the transcript tail is cut when the combined context overflows. */
export function buildChatContext(doc: any) {
  const recent = (doc.chat ?? []).slice(-6);
  const history = recent.map((m: any) => `${m.role}: ${m.content}`).join("\n");
  const notes = (doc.notes ?? "").trim();
  const transcript = (doc.transcript ?? "").trim();
  const full = [
    notes ? `Study pack:\n${notes}` : "",
    transcript ? `Transcript:\n${transcript}` : "",
    history ? `Recent conversation:\n${history}` : "",
  ]
    .join("\n\n")
    .trim();
  if (full.length <= MAX_CONTEXT_CHARS) return full;

  // Over budget: keep the summary whole and fill the head of the transcript,
  // then the recent conversation, into the remaining room.
  let context = notes ? `Study pack:\n${notes}` : "";
  let room = MAX_CONTEXT_CHARS - context.length - "\n\n".length;
  if (transcript && room > 0) {
    const kept = transcript.slice(0, room);
    context += `\n\nTranscript:\n${kept}`;
    if (kept.length < transcript.length) context += "\n\n[transcript truncated]";
    room = MAX_CONTEXT_CHARS - context.length - "\n\n".length;
  }
  if (history && room > 0) {
    context += `\n\nRecent conversation:\n${history.slice(0, room)}`;
  }
  return context.slice(0, MAX_CONTEXT_CHARS);
}

/** Drops consecutive duplicate user turns (an artifact of an early regenerate
 *  bug that saved "[user, user, assistant]"). Applied on every persist so the
 *  stored chat stays cleaned, not just the display. */
export function dedupeTurnArtifacts(chat: any[]): any[] {
  const out: any[] = [];
  for (const message of chat) {
    const last = out[out.length - 1];
    if (
      message?.role === "user" &&
      last?.role === "user" &&
      last.content === message.content
    ) {
      continue;
    }
    out.push(message);
  }
  return out;
}

/** Persist a chat turn (plus a clean history slice) and return what was stored. */
export async function persistChatTurn(
  id: ObjectId,
  messages: any[],
): Promise<any[]> {
  const stored = dedupeTurnArtifacts(capChat(messages));
  await (await sessionsCol()).updateOne(
    { _id: id },
    { $set: { chat: stored, updatedAt: new Date() } },
  );
  return stored;
}