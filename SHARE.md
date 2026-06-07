# Share This Project

## For someone working on the code (GitHub)

Run these commands in Cursor terminal after logging into GitHub:

```powershell
cd C:\Users\kodal\Desktop\pizza-workforce
gh auth login
```

Choose: **GitHub.com** → **HTTPS** → **Login with a web browser**

Then create and push the repo:

```powershell
gh repo create pizza-workforce --public --source=. --remote=origin --push
```

Send your collaborator this link:

```
https://github.com/YOUR_USERNAME/pizza-workforce
```

They clone with:

```powershell
git clone https://github.com/YOUR_USERNAME/pizza-workforce.git
cd pizza-workforce
npm install
cp .env.local.example .env.local
```

Then add Supabase keys to `.env.local` (get from project owner — never commit `.env.local`).

---

## For someone using the live app (Vercel)

After GitHub is set up:

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `pizza-workforce` from GitHub
3. Add environment variables from `.env.local`
4. Deploy — share the Vercel URL (e.g. `https://pizza-workforce.vercel.app`)

Demo logins (password: `Demo1234!`):

- `staff1@pizza.nz` — clock in/out
- `sm-ponsonby@pizza.nz` — store manager

---

## What NOT to share

- `.env.local` (secret keys)
- Supabase service_role key
