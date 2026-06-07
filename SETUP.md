# Pizza Workforce — Setup Guide

This guide assumes no coding experience. Follow each step in order.

## What you need (all free)

1. **Cursor** — [cursor.com](https://cursor.com) (you already have this)
2. **Supabase** — [supabase.com](https://supabase.com) (database + login)
3. **Vercel** — [vercel.com](https://vercel.com) (hosting, optional for now)
4. **Node.js** — [nodejs.org](https://nodejs.org) (download the LTS version)

---

## Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up free
2. Click **New Project**
3. Choose **Sydney (ap-southeast-2)** — closest to New Zealand
4. Set a database password (save it somewhere safe)
5. Wait 2–3 minutes for the project to finish setting up

---

## Step 2: Run the database SQL

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project folder
4. Copy **all** the text and paste it into the SQL Editor
5. Click **Run** (green button)
6. You should see "Success" — this creates all tables, security rules, and 3 stores

---

## Step 3: Get your API keys

1. In Supabase, go to **Settings** → **API**
2. Copy these three values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (also starts with `eyJ...` — keep this secret!)

---

## Step 4: Configure environment variables

1. In the `pizza-workforce` folder, copy `.env.local.example` to `.env.local`
2. Open `.env.local` in Cursor and paste your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RESEND_API_KEY=optional_for_now
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save the file.

---

## Step 5: Install and run locally

Open the terminal in Cursor (**View** → **Terminal**) and run:

```bash
npm install
npm run dev
```

Open your browser at **http://localhost:3000**

---

## Step 6: Create demo users

After `npm install`, run the seed script to create 20 demo accounts:

```bash
node scripts/seed-users.mjs
```

All demo accounts use password: **Demo1234!**

| Email | Role |
|-------|------|
| hoo@pizza.nz | Head of Operations |
| admin@pizza.nz | System Admin |
| hr@pizza.nz | HR Head |
| accounts@pizza.nz | Accounts Head |
| am@pizza.nz | Area Manager |
| sm-ponsonby@pizza.nz | Store Manager (Ponsonby) |
| staff1@pizza.nz | Team Member (clock in/out) |

---

## Step 7: Deploy to Vercel (go live)

1. Push your code to GitHub (Cursor can help with this)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Add the same environment variables from `.env.local`
5. Click **Deploy**
6. You get a URL like `pizza-workforce.vercel.app`

Update `NEXT_PUBLIC_APP_URL` in Vercel to your live URL.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key" | Double-check `.env.local` values from Supabase Settings → API |
| Login does nothing | Run `node scripts/seed-users.mjs` to create users |
| SQL errors | Make sure you ran the full `schema.sql` file |
| Camera won't open on clock-in | Allow location + camera permissions in your browser |
| npm not found | Install Node.js from nodejs.org and restart Cursor |

---

## npm packages installed

```bash
npm install @supabase/ssr @supabase/supabase-js date-fns date-fns-tz lucide-react next papaparse react react-dom recharts resend && npm install -D @types/node @types/papaparse @types/react @types/react-dom autoprefixer eslint eslint-config-next postcss tailwindcss typescript
```

(Already listed in `package.json` — just run `npm install`.)
