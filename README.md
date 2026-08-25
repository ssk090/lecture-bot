# Lecture Bot

Lecture Bot turns recorded lectures, uploaded audio, or pasted transcripts into study notes, flashcards, and quizzes. Each lecture is kept in its own persisted session, and a chat drawer lets you ask questions that are answered strictly from that session's content.

## Features

- Record audio in the browser or upload an audio/video file.
- Transcribe audio with a configurable local Parakeet command (live browser captions while recording).
- Generate study packs with opencode (multi-part chunking for long lectures).
- Session threads: create, rename (AI-named from the transcript), search, and delete sessions, persisted in MongoDB.
- Session chat drawer: ask follow-up questions that are answered only from the selected session's transcript + study pack (no cross-session leakage). Full-screen drawer with streaming replies, copy / regenerate / delete per message, and clear-all with confirmation.
- Download generated study packs as Markdown.
- Confirmation dialogs for destructive actions (delete session, clear chat).

## Requirements

- Bun
- MongoDB
- opencode, either a running server or SDK-managed server
- Parakeet MLX or another compatible transcription command

## Setup

```bash
bun install
cp .env.example .env
```

Edit `.env` for your local services:

```bash
OPENCODE_URL=http://localhost:4096
OPENCODE_MODEL=opencode-go/deepseek-v4-flash
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=lecture-bot
PARAKEET_CMD=parakeet-mlx
PORT=3000
```

## Run locally

```bash
docker compose up -d mongo   # start MongoDB (or run your own)
bun run dev
```

The backend runs on `http://localhost:3000`. The frontend is served by Vite (with `/api` proxied to the backend).

## Tests

The backend has an integration test that verifies chat answers stay scoped to the selected session (uses a `FAKE_LLM=1` seam, no real model calls). Requires MongoDB.

```bash
cd backend && bun test tests/
```

## Build

```bash
bun run build
```

## Docker

```bash
docker compose up --build
```

## Project layout

- `backend/`: Express API with modular routers
  - `src/routes/pipeline.ts`: `POST /api/transcribe`, `/api/study`, `/api/title`
  - `src/routes/sessions.ts`: session CRUD + study-pack export
  - `src/routes/chat.ts`: `POST /api/sessions/:id/chat/stream` (SSE) and `/api/sessions/:id/chat`
  - `src/llm.ts`: opencode streaming + prompts + timeouts/limits
  - `src/chat.ts`: session context builder + chat persistence
  - `src/db.ts`: MongoDB client, indexes
  - `tests/chat-isolation.test.ts`: cross-session chat isolation
- `frontend/`: Vite React app
  - `src/components/`: presentational UI (Toolbar, StudyPack, TranscriptWorkspace, ThreadSidebar, ConfirmDialog, drawer chat, etc.)
  - `src/hooks/`: operation hooks (sessions, drawer chat, transcription, title auto-naming)
  - `src/store.ts`: per-session workspace state (zustand)