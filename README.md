# bewithai

Internal ops platform for bewithai, an AI-consulting company: issue intake,
project registration with a 3-step manager approval workflow, consultation
booking, a skill directory, e-learning, cross-company reports, and
multi-tenant settings. See `design/` for the original UI mockups this app is
built from.

Runs entirely on your machine — no external account or cloud service
required. SQLite is the database; everything is a single local file.

## Requirements

- Node.js 20+

## Setup

```bash
npm install
npm run setup   # copies .env.example -> .env, runs migrations, seeds demo data
npm run dev
```

Then open http://localhost:3000 and sign in with one of the demo accounts
printed by the seed script (password for all of them: `password123`):

| Account | Role |
|---|---|
| `traitet@bewithai.dev` | Consultant — sees every client company |
| `pranee@acme.dev` | Section Manager, Acme Manufacturing |
| `warit@acme.dev` | Department Manager, Acme Manufacturing |
| `napat@acme.dev` | Division Manager, Acme Manufacturing |
| `kanya@acme.dev` | Member, Acme Manufacturing |

## Stack

- **Next.js** (App Router, TypeScript, Server Actions) — no separate backend.
- **SQLite**, via **Drizzle ORM** (`src/lib/db/schema.ts`). The file lives at
  `data/dev.db`, created by `npm run setup`.
- **Auth**: hand-rolled — a signed JWT session cookie (`src/lib/auth.ts`),
  bcrypt password hashing. No third-party auth provider.
- **Tailwind CSS v4** for styling.

## Multi-tenant data isolation

SQLite has no Row-Level Security, so isolation is enforced at the
application layer instead — see the long comment at the top of
`src/lib/db/tenant-db.ts` for exactly how, and what to add back if this ever
moves to Postgres. The short version: every query that touches a
tenant-owned table goes through a function in `src/lib/repos/*` that takes
an explicit `Scope` (never a bare company id string), and only consultants
(`companyId: null` in their session) can see across companies.

## Useful scripts

```bash
npm run dev          # start the app
npm run build         # production build
npm run db:generate   # generate a new migration after editing schema.ts
npm run db:migrate    # apply pending migrations
npm run db:seed       # wipe and reseed demo data
npm run db:studio     # open Drizzle Studio to browse the database
```

## Deploying later

This is built to run locally first and move to a self-managed Digital Ocean
server afterwards — see the project notes for the planned migration path
(swap the Drizzle SQLite provider for Postgres, add Docker, etc.). Nothing
here is tied to a specific hosting provider.
