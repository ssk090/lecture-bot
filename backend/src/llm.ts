import {
  createOpencode,
  createOpencodeClient,
  type Part,
} from "@opencode-ai/sdk";

export const SYSTEM_PROMPT = `You are an academic study assistant. Use only the provided transcript unless a term from it needs a brief standard definition. Remove filler and logistics. Preserve lecture context.

Return markdown with:
1. High-Level Summary: 2-3 sentence subject/objective and one key takeaway.
2. Structured Notes: thematic sections with bullets, definitions, formulas, frameworks, mechanisms, examples.
3. High-Yield Points: 4-7 testable ideas, pitfalls, exceptions, nuances.
4. Flashcards: 5-10 Front/Back cards.
5. Practice Quiz: 4-5 mixed questions, then answer key with brief rationales.`;

export const CHAT_SYSTEM = `You answer questions using ONLY the selected session context below. Do not use other sessions, your memory, or outside facts. If the answer is not in the context, say: I could not find that in this session.`;

export const TITLE_SYSTEM =
  "Name this study session in 3-7 words. Return only the title, no quotes or punctuation at the end.";

export const STUDY_TIMEOUT_MS = 10 * 60 * 1000;
export const CHAT_TIMEOUT_MS = 150 * 1000;
export const MAX_CONTEXT_CHARS = 120_000;

async function setupModel() {
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
  return { client: opencode.client, providerID, modelID };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deterministic stand-in for the LLM, used only when FAKE_LLM=1 (tests). */
function fakeAnswer(prompt: string): string {
  const marker = ["ALPHA-ONLY", "BETA-ONLY", "GAMMA-ONLY"].find((m) =>
    prompt.includes(m),
  );
  return `FOUND_${marker ?? "NONE"}`;
}

/**
 * Runs a prompt and yields text chunks as they arrive. Rejects when the
 * deadline passes. With FAKE_LLM=1 it yields a single canned answer.
 */
export async function* streamLlm(
  prompt: string,
  system: string,
  timeoutMs: number,
): AsyncGenerator<string, void, void> {
  if (process.env.FAKE_LLM === "1") {
    yield fakeAnswer(prompt);
    return;
  }

  const { client, providerID, modelID } = await setupModel();
  const session = await client.session.create({ body: { title: "Lecture" } });
  if (!session.data) throw new Error("opencode session creation failed");
  const sessionID = session.data.id;

  const events = await client.event.subscribe({});
  await client.session.promptAsync({
    path: { id: sessionID },
    body: {
      system,
      parts: [{ type: "text", text: prompt }],
      model: modelID ? { providerID, modelID } : undefined,
    },
  });

  const deadline = Date.now() + timeoutMs;
  for await (const event of events.stream) {
    if (Date.now() > deadline)
      throw new Error(`LLM timed out after ${Math.round(timeoutMs / 1000)}s`);
    const e = event as { type?: string; properties?: Record<string, unknown> };
    if (e.type === "message.part.updated") {
      const props = e.properties as {
        part?: Part & { sessionID?: string; text?: string };
        delta?: string;
      };
      const part = props.part;
      if (part?.type === "text" && part.sessionID === sessionID) {
        const chunk = props.delta ?? part.text ?? "";
        if (chunk) yield chunk;
      }
    } else if (e.type === "session.idle") {
      const props = e.properties as { sessionID?: string };
      if (props.sessionID === sessionID) return;
    } else if (e.type === "session.error") {
      const props = e.properties as { sessionID?: string; error?: string };
      if (props.sessionID === sessionID)
        throw new Error(props.error ?? "LLM session failed");
    }
  }
}

export async function askLlm(
  prompt: string,
  system: string,
  timeoutMs: number,
): Promise<string> {
  let out = "";
  for await (const chunk of streamLlm(prompt, system, timeoutMs)) {
    out += chunk;
  }
  return out.trim();
}

/** Keep the last MAX_CHAT_MESSAGES so a session doc does not grow forever. */
export function capChat<T>(messages: T[], max = 60): T[] {
  return messages.length > max ? messages.slice(-max) : messages;
}