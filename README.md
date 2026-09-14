# RESET — PlayStation Gaming Cafe Management System

Production-ready Next.js app for managing a PlayStation gaming cafe: customer booking site + staff admin panel with live screen sessions.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Supabase** — PostgreSQL, Auth, Realtime, Storage
- **React Hook Form** + **Zod**
- **Recharts** for analytics

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. Copy URL + anon key + service role key into `.env.local`.
3. Run the SQL migration:

```text
supabase/migrations/20260314000000_initial_schema.sql
```

4. Run seed data:

```text
supabase/seed.sql
```

5. Create an Auth user (email/password) in the Supabase dashboard.
6. Promote to owner:

```sql
update public.profiles set role = 'owner' where email = 'your@email.com';
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Customer landing |
| `/booking` | Guest booking flow |
| `/booking/success` | Confirmation |
| `/admin/login` | Staff login |
| `/admin/dashboard` | Live screens + KPIs |
| `/admin/bookings` | Booking management |
| `/admin/screens` | Screen management |
| `/admin/games` | Game catalog |
| `/admin/pricing` | Pricing rules |
| `/admin/customers` | Customer CRM |
| `/admin/earnings` | Revenue analytics |
| `/admin/settings` | Cafe settings |

## Architecture notes

- **Pricing** is always computed server-side (`src/lib/pricing.ts`). Client estimates are display-only.
- **Booking conflicts** are blocked by a Postgres trigger + server checks.
- **Session timers** use server timestamps + pause accounting (`getSessionElapsedMs`).
- **Realtime** subscriptions on `screens`, `sessions`, and `bookings` refresh the admin dashboard.
- **Roles**: `owner` (full), `manager` (ops + earnings), `staff` (bookings/sessions/screens).
- **Service role key** is server-only (`src/lib/supabase/admin.ts`). Never expose it to the browser.
- Auth session refresh runs in Next.js 16 `src/proxy.ts`.

## Deploy

- **Vercel** — import the repo, set env vars from `.env.example`.
- **Supabase** — already hosts DB/Auth/Realtime/Storage.

## Scripts

```bash
npm run dev      # development
npm run build    # production build
npm run start    # start production server
npm run lint     # eslint
```
