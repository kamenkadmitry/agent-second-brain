# Agent Second Brain — v2

Full-stack personal second-brain. Capture via Telegram → classify with LLM → store in
PostgreSQL with dual memory models (Ebbinghaus forgetting curve for knowledge, Eisenhower
matrix for tasks) → visualise as a force-directed knowledge graph in the React dashboard.

## Stack

| Layer            | Tech                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| Language/runtime | TypeScript, Node.js 20, ESM                                           |
| Backend          | Fastify 5, Prisma (PostgreSQL), BullMQ + Redis, Pino, Zod             |
| AI               | Vercel AI SDK + OpenAI (`gpt-4o` by default), Deepgram, Todoist       |
| Frontend         | React 18, Vite 5, TailwindCSS 3, react-force-graph-2d, @dnd-kit       |
| Auth             | JWT (register / login), bcrypt                                        |
| Telegram         | **Webhook** (`/api/telegram/webhook`) with secret-token verification  |
| Infra            | Docker Compose (Postgres 15, Redis 7, backend, frontend/nginx)        |
| Tests            | Vitest (pure units + fail-fast payload parsing)                       |

Monorepo (`pnpm` workspaces):

```
agent-second-brain/
├── apps/
│   ├── backend/        # Fastify + Prisma + BullMQ
│   └── frontend/       # Vite + React + Tailwind
├── docker-compose.yml
└── .env.example
```

## Quick start (Docker — recommended)

```bash
cp .env.example .env
# edit .env: set JWT_SECRET (>=32 chars), TELEGRAM_WEBHOOK_SECRET, optionally API keys

docker compose up --build
```

- UI:       http://localhost:8080
- API:      http://localhost:3000
- Postgres: localhost:5432  (user/pass from `.env`)
- Redis:    localhost:6379

The backend container runs `prisma migrate deploy` then `tsx prisma/seed.ts` on
startup. After that you can log in with the seeded account:

```
email:    admin@example.com
password: admin12345
```

Change that password from the UI or via `/api/auth/register` + deletion of the seed
user. You can also override seed creds via env:
`SEED_USER_EMAIL`, `SEED_USER_PASSWORD`.

## Local dev (without Docker)

You still need Postgres + Redis running locally (`docker compose up postgres redis` is
easiest).

```bash
pnpm install
pnpm --filter @asb/backend exec prisma migrate dev
pnpm --filter @asb/backend exec tsx prisma/seed.ts
pnpm dev            # runs backend + frontend in parallel
```

Backend: http://localhost:3000 · Frontend: http://localhost:5173

## Feature tour

- **Dashboard** (`/`): counts + recent entries.
- **Graph** (`/graph`): interactive force-directed graph of entries / memories / tasks /
  tags. Links come from (a) explicit `GraphEdge` rows written by the ingest pipeline
  (`Entry GENERATED Memory/Task`) and (b) implicit `HAS_TAG` tag relations.
- **Eisenhower** (`/eisenhower`): drag tasks between the four quadrants to change
  `isUrgent`/`isImportant` via `PATCH /api/tasks/:id`.
- **Memories** (`/memories`): create, tier, and "touch" memories. Ebbinghaus decay
  runs nightly via a BullMQ repeatable job (`0 3 * * *`); you can also trigger a pass
  manually from this page (`POST /api/trigger/decay`).
- **Entries** (`/entries`): manual capture of text / voice / image / url / forwarded
  items with tags.
- **Skills** (`/skills`): toggle and edit JSON config for predefined system skills. No
  arbitrary code injection from the UI — only declared skills may be toggled.
- **Settings** (`/settings`): per-user LLM base URL / model / API key, Telegram token
  and chat id, Deepgram and Todoist keys. Secrets are stored in the DB and the API
  only returns masked views (`••••abcd`).

## Telegram webhook

1. Set `TELEGRAM_WEBHOOK_SECRET` to a strong random string in `.env`.
2. Point Telegram at your backend:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-host>/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Each update is validated (Zod), enqueued into the BullMQ `ingest` queue, and processed
by the pipeline:

```
capture → download (if voice) → transcribe (Deepgram) → classify (LLM) →
  create Entry/Memory/Task → record GraphEdge → (optional) Todoist sync
```

Routing: the bot maps incoming `from.id` to a user via `Settings.telegramChatId`. If no
mapping exists **and** there is exactly one user in the system, updates are routed to
that user (single-user deployment). Otherwise the webhook fails fast with HTTP 400.

## Engineering policy

The codebase strictly follows the fail-fast policy:

1. Invalid env config throws at startup (`src/config/env.ts`, Zod-validated).
2. Invalid Telegram payloads throw in `parseTelegramUpdate`.
3. Missing API keys throw before I/O (LLM, Deepgram, Todoist).
4. No chained `a || b || c` defaults for required config; env has explicit defaults
   only where they are genuinely optional.
5. No broad `try/catch` in async handlers — errors bubble to the Fastify error handler
   or to the BullMQ worker (which retries with bounded attempts and structured logs).
6. Pino structured logs everywhere. Worker failures log job id + error context.

## Tests

```bash
pnpm --filter @asb/backend test
```

- `tests/ebbinghaus.test.ts` — decay monotonicity, tier boundaries, Core pinning.
- `tests/eisenhower.test.ts` — quadrant mapping + heuristic classifier.
- `tests/telegram-webhook.test.ts` — fail-fast rejection of invalid/empty Telegram
  payloads; correct parsing of text/voice/photo/forward messages.

## API surface

```
POST /api/auth/register           { email, password } -> { token, user }
POST /api/auth/login              { email, password } -> { token, user }
GET  /api/auth/me                                     -> { user }

GET  /api/entries                                     -> { entries }
POST /api/entries                 { type, content, tags?, metadata? }
DELETE /api/entries/:id

GET  /api/memories
POST /api/memories                { content, summary?, tier?, tags? }
PATCH /api/memories/:id           { content?, summary?, tier?, tags?, touch? }
DELETE /api/memories/:id

GET  /api/tasks
POST /api/tasks                   { content, isUrgent?, isImportant?, status?, dueAt?, tags? }
PATCH /api/tasks/:id              partial update
DELETE /api/tasks/:id

GET  /api/skills
POST /api/skills                  { name, enabled?, config? }
PATCH /api/skills/:id             { enabled?, config? }
DELETE /api/skills/:id

GET  /api/tags
POST /api/tags                    { name, color? }
DELETE /api/tags/:id

GET  /api/settings                -> { settings (API keys masked) }
PATCH /api/settings               partial update

GET  /api/graph                   -> { nodes, links }

POST /api/telegram/webhook        Telegram secret-token required
POST /api/trigger/decay           enqueue manual memory decay pass

GET  /health
```

All `/api/*` endpoints except `/api/auth/*` and `/api/telegram/webhook` require
`Authorization: Bearer <jwt>`.
