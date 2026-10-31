# Overlap

Find a time that works for everyone. Create an event, share the link, everyone
paints their availability, and Overlap shows when most people are free.
No sign-ups.

Built with Next.js (App Router) · TypeScript · Tailwind CSS · Supabase.

## How it fits together

- **The browser never talks to the database directly.** Pages load data on the
  server, and every write goes through a Server Action (`app/actions.ts`) that
  validates the input first.
- **Row Level Security is on with no policies**, so the public (publishable)
  key can't read or write anything. Only the server, using the secret key, can.
- Times are stored in the event's own timezone and converted to each viewer's
  timezone for display.

## Run it locally

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/HsiaoLiang/Overlap.git
cd Overlap
npm install
cp .env.example .env.local   # then fill in the values (see Supabase setup)
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**.
   - Name: `overlap`. Pick a strong database password and save it somewhere.
   - Region: the one closest to your users (e.g. Tokyo or Singapore for Taiwan).
   - Leave **Data API** enabled.
2. When the project is ready, open **SQL Editor → New query**, paste the
   contents of `supabase/migrations/001_tables.sql`, and click **Run**.
   You should see "Success. No rows returned".
3. Open **Project Settings → API Keys** and copy:
   - the **publishable** key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - the **secret** key (`sb_secret_…`) → `SUPABASE_SECRET_KEY`
4. Copy the **Project URL** (`https://<id>.supabase.co`, shown under
   **Project Settings → Data API** or the **Connect** button) →
   `NEXT_PUBLIC_SUPABASE_URL`.

Run each new file in `supabase/migrations/` the same way, in order, as later
steps add them.

## Scripts

| Command         | What it does                 |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the dev server         |
| `npm run build` | Production build             |
| `npm run lint`  | Lint                         |
