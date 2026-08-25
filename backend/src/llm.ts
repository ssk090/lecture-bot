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

export const STUDY_CONTINUE_SYSTEM = `You are continuing an existing study pack for the same lecture. Append the remaining material to the SAME document.

Strict rules:
- Do NOT re-emit the top-level headings (High-Level Summary, Structured Notes, High-Yield Points, Flashcards, Practice Quiz). They already exist in the document from the first part.
- Do NOT add any part, segment, or section markers such as \"Part 1\" or \"Section 2\".
- Continue in-progress sections and add new bullets, definitions, formulas, flashcards, and quiz items that extend the existing structure, using the transcript below.
- Output plain, appended study-pack content only.`;

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

export const CHUNK_SIZE = 8000;

/** Split a transcript into continuation-sized chunks at a sentence boundary. */
export function chunkTranscript(text: string, size = CHUNK_SIZE): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(". ", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

/**
 * Generate ONE study pack document from a (possibly long) transcript. For long
 * transcripts the first chunk writes the full structure and each following
 * chunk's continuation is merged into the existing sections, so the output has
 * no part markers or duplicate "More X" sections.
 */
export async function generateStudyDoc(
  transcript: string,
  timeoutMs = STUDY_TIMEOUT_MS,
): Promise<string> {
  let doc = '';
  for await (const event of generateStudyDocStream(transcript, timeoutMs)) {
    if (event.kind === 'merged') doc = event.document;
  }
  return doc.trim();
}

/** Normalize a heading for matching: strip #/level, leading "More ", collapse case. */
function normHeading(h: string): string {
  return h.replace(/^\s*#+\s+/, '').replace(/^more\s+/i, '').trim().toLowerCase();
}

/**
 * Fold continuation content into the matching existing sections instead of
 * appending "More X" blocks. Each titled block is merged under the
 * corresponding top-level section heading in the base document (by exact
 * heading match, falling back to a contains-match so e.g. "Quiz" lands in
 * "Practice Quiz").
 */
export function mergeContinuation(base: string, addition: string): string {
  const baseLines = base.split('\n');
  const headings: { key: string; index: number }[] = [];
  baseLines.forEach((line, i) => {
    const m = line.match(/^\s*#+\s+(.+)\s*$/);
    if (m) headings.push({ key: normHeading(m[1]), index: i });
  });

  const headingRe = /^\s*#+\s+(.+)\s*$/;
  const moreRe = /^\s*more\s+(.+)\s*$/i; // model emits "More High-Yield Points" without #
  const blocks: { original: string | null; lines: string[] }[] = [];
  let cur: { original: string | null; lines: string[] } | null = null;
  for (const line of addition.split('\n')) {
    const heading = line.match(headingRe) ?? line.match(moreRe);
    if (heading) {
      if (cur) blocks.push(cur);
      cur = { original: heading[1].trim(), lines: [] };
    } else {
      if (!cur) cur = { original: null, lines: [] };
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);

  // Route each titled block into the best-matching base section.
  const insertions = new Map<number, string[]>();
  const leftovers: string[] = [];
  for (const block of blocks) {
    if (!block.lines.some((l) => l.trim())) continue;
    if (block.original === null) {
      leftovers.push(...block.lines);
      continue;
    }
    const key = normHeading(block.original);
    const best =
      headings.find((h) => h.key === key) ??
      headings.find((h) => h.key.includes(key) || key.includes(h.key));
    if (best) {
      const arr = insertions.get(best.index) ?? [];
      insertions.set(best.index, [...arr, ...block.lines]);
    } else {
      leftovers.push('', block.original, ...block.lines);
    }
  }

  const out: string[] = [];
  for (let i = 0; i < baseLines.length; i++) {
    out.push(baseLines[i]);
    const inserted = insertions.get(i);
    if (inserted) out.push(...inserted);
  }
  if (leftovers.length) out.push(...leftovers);
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export type StudyStreamEvent =
  | { kind: 'progress'; index: number; total: number }
  | { kind: 'delta'; text: string }
  | { kind: 'merged'; document: string };

/**
 * Streaming variant: processes the transcript in small chunks but emits a
 * single merged document. The first chunk's tokens stream live; each later
 * chunk's output is merged into the existing sections and a clean merged
 * snapshot is emitted so the preview stays sectioned (no "More X").
 */
export async function* generateStudyDocStream(
  transcript: string,
  timeoutMs = STUDY_TIMEOUT_MS,
): AsyncGenerator<StudyStreamEvent, void, void> {
  const parts = chunkTranscript(transcript);
  if (!parts.length) return;
  let doc = '';
  for (let i = 0; i < parts.length; i++) {
    yield { kind: 'progress', index: i + 1, total: parts.length };
    const system = i === 0 ? SYSTEM_PROMPT : STUDY_CONTINUE_SYSTEM;
    let raw = '';
    for await (const chunk of streamLlm(parts[i], system, timeoutMs)) {
      raw += chunk;
      if (i === 0) yield { kind: 'delta', text: chunk };
    }
    doc = i === 0 ? raw.trim() : mergeContinuation(doc, raw).trim();
    yield { kind: 'merged', document: doc };
  }
}

/** Keep the last MAX_CHAT_MESSAGES so a session doc does not grow forever. */
export function capChat<T>(messages: T[], max = 60): T[] {
  return messages.length > max ? messages.slice(-max) : messages;
}