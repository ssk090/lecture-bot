import { z } from 'zod';

const apiError = z.object({ error: z.string().optional() });

export async function readError(res: Response, body: unknown) {
  const parsed = apiError.safeParse(body);
  throw new Error(parsed.success && parsed.data.error ? parsed.data.error : `${res.status} request failed`);
}

const transcribeResponse = z.object({ transcript: z.string() });
const studyResponse = z.object({ notes: z.string() });
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

export async function generateStudyPack(transcript: string) {
  const res = await fetch('/api/study', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return studyResponse.parse(json).notes;
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

export async function askSession(id: string, question: string) {
  const res = await fetch(`/api/sessions/${id}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const json = await res.json();
  if (!res.ok) await readError(res, json);
  return z.object({ answer: z.string(), chat: z.array(chatMessageSchema) }).parse(json);
}
