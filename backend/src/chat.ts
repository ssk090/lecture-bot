import type { ObjectId } from "mongodb";
import { sessions as sessionsCol } from "./db";
import { MAX_CONTEXT_CHARS, capChat } from "./llm";

/** Conversation context = transcript + notes + recent chat, size-capped. */
export function buildChatContext(doc: any) {
  const recent = (doc.chat ?? []).slice(-6);
  const history = recent.map((m: any) => `${m.role}: ${m.content}`).join("\n");
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