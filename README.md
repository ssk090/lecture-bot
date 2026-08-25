# Lecture Bot

Lecture Bot turns recorded lectures, uploaded audio, or pasted transcripts into study notes, flashcards, and quizzes.

## Features

- Record audio in the browser or upload an audio file.
- Transcribe audio with a configurable local Parakeet command.
- Generate study packs with opencode.
- Save sessions and generated notes in MongoDB.
- Download generated study packs as Markdown.

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
bun run dev
```

The backend runs on `http://localhost:3000`. The frontend is served by Vite.

## Build

```bash
bun run build
```

## Docker

```bash
docker compose up --build
```

## Project layout

- `backend/`: Express API, transcription, opencode generation, MongoDB session storage.
- `frontend/`: Vite React app.
- `docker-compose.yml`: App and MongoDB services.
