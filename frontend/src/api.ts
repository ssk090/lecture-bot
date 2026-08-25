import { z } from 'zod';

const apiError = z.object({ error: z.string().optional() });

export async function readError(res: Response, body: unknown) {
  const parsed = apiError.safeParse(body);
  throw new Error(parsed.success && parsed.data.error ? parsed.data.error : `${res.status} request failed`);
}

const transcribeResponse = z.object({ transcript: z.string() });
const titleResponse = z.object({ title: z.string() });
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string().or(z.date()).optional()
});

export async function transcribeAudio(blob: Blob, name: string) {
  const body = new FormData();
  body.append('audio', blob, name);
  const res = await fetch('/api/transcribe', { method: 'POST', body });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return transcribeResponse.parse(json).transcript;
}

export async function generateSessionTitle(text: string) {
  const res = await fetch('/api/title', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return titleResponse.parse(json).title;
}

/** Streams a single, merged study pack. onDelta fires per token (first chunk),
 *  onMerged fires with the clean merged document after each chunk, and
 *  onProgress at each chunk start. */
export async function streamStudyPack(
  transcript: string,
  callbacks: {
    onDelta?: (delta: string) => void;
    onMerged?: (document: string) => void;
    onProgress?: (index: number, total: number) => void;
  } = {}
): Promise<void> {
  const res = await fetch('/api/study/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `${res.status} study request failed`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = JSON.parse(line.slice(5).trim());
        if (payload.progress) callbacks.onProgress?.(payload.progress.index, payload.progress.total);
        else if (payload.merged) callbacks.onMerged?.(payload.merged);
        else if (payload.delta) callbacks.onDelta?.(payload.delta);
        else if (payload.error) throw new Error(payload.error);
      }
    }
  }
}

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  transcript: z.string(),
  notes: z.string().optional().default(''),
  chat: z.array(chatMessageSchema).optional().default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Session = z.infer<typeof sessionSchema>;

export async function listSessions() {
  const res = await fetch('/api/sessions');
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return z.object({ sessions: z.array(sessionSchema) }).parse(json).sessions;
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}`);
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return z.object({ session: sessionSchema }).parse(json).session;
}

export async function createSession(transcript = '', notes = '', title?: string) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript, notes, title })
  });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return z.object({ id: z.string() }).parse(json).id;
}

export async function updateSession(id: string, body: { transcript?: string; notes?: string; title?: string; chat?: ChatMessage[] }) {
  const res = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) await readError(res, await res.clone().json());
}

export async function saveSession(id: string | null, transcript: string, notes: string, title?: string) {
  const sessionId = id ?? (await createSession(transcript, notes, title));
  await updateSession(sessionId, { transcript, notes, title });
  const res = await fetch(`/api/sessions/${sessionId}/export`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return { id: sessionId, path: z.object({ path: z.string() }).parse(json).path };
}

export async function deleteSession(id: string) {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
}

/**
 * Streams a session-scoped answer over SSE. onDelta fires for every text
 * chunk; the resolved chat (persisted with the answer) is returned.
 */
export async function streamChat(
  id: string,
  question: string,
  onDelta: (delta: string) => void,
  mode: 'ask' | 'regenerate' = 'ask'
): Promise<ChatMessage[]> {
  const res = await fetch(`/api/sessions/${id}/chat/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question, mode })
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `${res.status} chat request failed`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chat: ChatMessage[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = JSON.parse(line.slice(5).trim());
        if (payload.delta) onDelta(payload.delta);
        else if (payload.done) chat = payload.chat;
        else if (payload.error) throw new Error(payload.error);
      }
    }
  }
  if (!chat.length) throw new Error('chat stream ended without a response');
  return chat;
}
