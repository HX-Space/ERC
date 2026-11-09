# Relations Hub

Confidential Employee Relations workspace for ER specialists, HR, managers, and admins. Meetings, follow-ups, employee history, directory, analytics, manager feedback, and user administration — with role-based access.

Inspired by an internal HTML prototype for feature scope only; the UI is a custom “Confidential Desk” design (not a pixel/theme copy of the prototype).

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion, next-themes |
| Auth | Auth.js v5 (credentials + JWT) |
| Data | PostgreSQL via raw `pg` + one initial SQL file |
| AI | OpenAI (Chat Completions with strict JSON schemas, audio transcription) behind `OPENAI_API_KEY`; built-in local engine when no key is set |
| Icons | Lucide React |

**Hard constraints**

- **No Prisma** — repositories use parameterized SQL through `pg`
- **Local development never touches production** — with `next dev`, a non-local `DATABASE_URL` is refused unless `ALLOW_REMOTE_DB=true`; `db:migrate` and `db:seed` run against `localhost` only, with no override
- Local Docker Postgres for development (host port **5435**)

## Features

### Auth & roles

- Credential sign-in; after login the URL redirects to the role home route (not `/`)
- Route protection via Next.js 16 `proxy.ts` (not legacy `middleware`)
- Roles: `ADMIN` · `ER` · `HR` · `MANAGER`

| Role | Access |
| --- | --- |
| **ER** | Meetings, Follow-ups, History, Directory |
| **HR** | Analytics, History, Follow-ups |
| **Manager** | Manager Feedback (own team) |
| **Admin** | All modules + Admin user management |

Permissions helpers live in `src/lib/rbac.ts` (create meetings, close follow-ups, manage users).

### Meetings

- List with search, attention strip (overdue / due soon), detail drawer
- Create meeting drawer: org filters, type (Individual / Group), channel, outcomes, pulse scores, follow-ups, simulated AI note assist
- Channel display: **P2P** (Face-to-Face), monitor icon (Online), phone icon (Phone) — DB enum values unchanged

### Follow-ups

- Filters: Open · Overdue · Closed · All
- **Close** column with circle-check control
- Confirm dialog: item summary, optional closing note, Cancel / Mark closed
- Closing records the action taken — not that the issue is resolved
- Only Admin / ER can close

### Employee History

- Searchable employee picker (department, title, “has records” filter)
- Profile header with status chips, meeting/feedback counts, pulse chips (Pulse · Avg · Trend)
- Timeline of ER meetings and manager feedback; follow-up history

### Directory

- Browse and search everyone (ER and Admin)
- Admin: **Import CSV** (create or update; nothing is deleted), **Add manager**, **Add employee**, and an Active / Inactive switch per person
- CSV columns: `code,name,title,department,unit,team,manager_code,manager_name,manager_title,status` (status optional, defaults to Active)

### Analytics (HR / Admin)

- Meeting and follow-up KPIs, filters, departmental breakdowns
- AI management insights for the current selection: summary, recurring issues, positive trends, recommended actions

### Manager Feedback

- Written or voice-mode feedback cycles for the manager’s team
- Voice mode records from the microphone and transcribes with OpenAI (audio is not stored)
- “Organise with AI” sorts the text into strengths, development, concerns, recommendations
- Draft / submit workflow; a submitted review is read-only and can be submitted once per cycle

### Admin

- First run: `/setup` creates the first admin while the database has no users, then closes for good
- Create ER, HR, Manager and Admin accounts (Manager accounts link to a manager in the Directory)
- Change roles, disable / enable accounts (an admin cannot disable or demote themself)

### Shell & UX

- Collapsible light sidebar (icon rail when collapsed; aligned square targets)
- Active route highlight; theme toggle (light / dark)
- Login page forced to a readable light shell (ink brand panel + paper form) regardless of app theme
- Full-width main content (no centered max-width column)
- Shared UI: panel, pill, drawer, toast, KPI (analytics/feedback), buttons with motion

## Design notes

- Direction: “framed sheet” — sidebar and top bar on one teal-grey frame, the work on a white sheet
- IBM Plex Sans throughout; IBM Plex Mono only for case IDs and employee codes
- One teal hue for data; status colours only on status; near-black primary button; no shadows at rest

## Project structure

```
db/migrations/          SQL schema (001_init.sql)
scripts/                migrate.ts, seed.ts
docker-compose.yml      local Postgres :5435
src/
  app/
    login/              sign-in (forced light shell)
    setup/              first-admin setup (only while there are no users)
    (app)/              authenticated routes + layout shell
      meetings/
      follow-ups/
      employees/        History
      directory/
      analytics/
      feedback/
      admin/
    actions/            server actions (auth, meetings, followups, …)
    api/auth/           Auth.js route
    api/ai/transcribe/  voice-note transcription (OpenAI)
  components/
    shell/              AppSidebar
    ui/                 button, panel, pill, drawer, toast, …
  lib/                  db, auth, rbac, pulse, ai (local engine), ai-server (OpenAI), …
  repositories/         raw SQL data access
  types/                shared TypeScript types
  proxy.ts              auth + RBAC gate
```

## Local setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres)

### Steps

```bash
docker compose up -d
cp .env.example .env.local
# Set AUTH_SECRET to a long random string
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). An empty database sends you to **/setup** to create the first admin. Then, as admin:

1. **Directory → Import CSV** (or Add manager / Add employee) to load the organisation
2. **Admin → Create user** for ER specialists, HR and managers (link each manager account to its manager code)

`npm run db:seed` is optional and only for a quick local demo; it fills the local database with sample people and meetings.

### Environment

All configuration comes from environment variables: `.env.local` locally, **Project → Settings → Environment Variables** on Vercel. See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. SSL is used automatically for non-local hosts |
| `AUTH_SECRET` | yes | Auth.js secret (long random string) |
| `AUTH_TRUST_HOST` | yes | `true` |
| `NEXTAUTH_URL` | local | App origin locally; on Vercel leave unset or set to the production domain |
| `OPENAI_API_KEY` | no | Turns on OpenAI for every AI feature. Without it the local engine answers and voice transcription is unavailable |
| `OPENAI_MODEL` | no | Chat model, default `gpt-4o-mini` |
| `OPENAI_TRANSCRIBE_MODEL` | no | Transcription model, default `gpt-4o-mini-transcribe` |
| `OPENAI_BASE_URL` | no | Default `https://api.openai.com/v1` |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | Organisation timezone for “today” and due dates, default `Africa/Cairo` |
| `DATABASE_POOL_MAX` | no | Connections per server instance (default 3 on Vercel, 10 locally) |
| `ALLOW_REMOTE_DB` | no | Local only: allow `next dev` to use a non-local database |

### Initial SQL

`db/migrations/001_init.sql` is the whole schema, with no data. Every table, enum type and index it creates is prefixed `employee_relations_`, so it sits safely beside other tables in a shared database (an existing `users`, `managers` or `employees` table is never touched). The file only creates objects; it contains no `DROP`, `DELETE`, `TRUNCATE` or `ALTER`.

Run it once, as a single transaction, so any error rolls everything back:

```bash
psql "<connection-url>" -v ON_ERROR_STOP=1 --single-transaction -f db/migrations/001_init.sql
```

Running it a second time stops at the first statement and changes nothing. The `employee_relations_ai_cache` table at its end is optional: without it, AI answers are simply not cached.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply `db/migrations/*.sql` to the **local** database |
| `npm run db:seed` | Optional local demo data (local database only) |

### Docker Postgres

- Image: `postgres:16-alpine`
- Host port: **5435** → container `5432` (avoids common Windows Postgres conflicts on 5433)
- User / password / DB: `er` / `er_local_dev` / `employee_relations`
- Volume: `er_pg_data`

## Demo accounts

Only when you ran `npm run db:seed` locally. Password for all: `Password123!`

| Email | Role |
| --- | --- |
| `admin@relations.local` | Admin |
| `fatma@relations.local` | ER Specialist |
| `hr@relations.local` | HR |
| `karim@relations.local` | Manager (M01) |
| `heba@relations.local` | Manager (M02) |

## Data model (overview)

Enums and tables are defined in `db/migrations/001_init.sql`; every name below carries the `employee_relations_` prefix in the database:

- **users** — email, bcrypt password, role, optional `manager_code`
- **managers** / **employees** — org hierarchy
- **meetings** — type, channel, outcomes, pulse JSON, AI summary fields
- **meeting_employees** — participants
- **followups** — open/closed items linked to meetings
- **manager_feedback** — written/voice feedback cycles
- **ai_cache** — cached AI responses, keyed by a hash of the request (optional)

## AI

All AI runs on the server (`src/lib/ai-server.ts`); the key never reaches the browser.

| Feature | Where | With `OPENAI_API_KEY` | Without |
| --- | --- | --- | --- |
| Meeting assist: summary, risks, positives, suggested follow-ups | New meeting → Analyse notes with AI | OpenAI, strict JSON schema | Local engine, same shape |
| Organise feedback into strengths / development / concerns / recommendations | Feedback → Organise with AI, and on submit | OpenAI | Local engine |
| Management insights for the selected meetings | Analytics | OpenAI (most recent 300 meetings, notes clipped) | Local keyword engine |
| Voice-note transcription | Feedback → Record voice note → Transcribe | OpenAI transcription | Not available: the manager types the transcript |

- Every result shows which engine produced it (the model name, or “Local engine”).
- If OpenAI fails (network, quota), the local engine answers and the screen says so.
- Identical requests are served from `employee_relations_ai_cache`, so reopening the same analytics selection costs nothing.
- The ER specialist decides what is kept: an AI summary is saved only when accepted, and suggested follow-ups are added one by one.

## Conventions

- Types and interfaces live under `src/types/`
- Page-specific UI lives in a `components/` folder next to that page
- Server mutations go through `src/app/actions/*`
- Data access goes through `src/repositories/*` (no ORM)
- Prefer `fetch` for client REST where applicable; this app mostly uses server components + server actions
