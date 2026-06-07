# Pizza Workforce Management System

Production-ready workforce management for a New Zealand pizza chain — 35 stores, 250+ staff.

## Features

- **9-role RBAC** — Head of Ops, System Admin, HR, Accounts, Area Manager, Store Manager, 2IC, Team Member
- **Roster builder** — Weekly grid with drag-and-drop, labour cost tracking, NZ break auto-scheduling
- **Clock in/out** — GPS geofence + selfie verification, mobile-first
- **Live shift board** — Real-time via Supabase Realtime
- **Timesheets** — Auto-generated from clock events, manager approval workflow
- **Leave management** — Apply, approve, decline with balance tracking
- **NZ employment law** — Minimum wage, break entitlements, overtime, KiwiSaver built in
- **Payroll CSV export** — Accounts-head only, with compliance pre-checks
- **Admin panel** — User management, geofence config, audit log

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Supabase (PostgreSQL, Auth, Realtime, Storage)
- Tailwind CSS
- Vercel hosting
- Resend (email), Papa Parse (CSV)

## Quick start

See **[SETUP.md](./SETUP.md)** for full step-by-step instructions.

```bash
cp .env.local.example .env.local   # add your Supabase keys
npm install
# Run supabase/schema.sql in Supabase SQL Editor
node scripts/seed-users.mjs
npm run dev
```

Open http://localhost:3000 and log in as `staff1@pizza.nz` / `Demo1234!`

## Project structure

```
src/
  app/           # Pages (login, dashboard, roster, clock, etc.)
  components/    # UI components
  lib/           # Auth, permissions, NZ employment rules, geofence
  types/         # TypeScript types
supabase/
  schema.sql     # Full database schema + RLS + triggers
  seed.sql       # Additional seed data
scripts/
  seed-users.mjs # Creates demo auth users + sample data
```

## Seed stores

| Store | Location |
|-------|----------|
| Ponsonby | -36.8523, 174.7477 |
| Newmarket | -36.8712, 174.7768 |
| Takapuna | -36.7872, 174.7752 |
