# Morning Ritual Tracker

Next.js + Supabase. Single user, email/password login, Postgres with row-level security.

## Environment variables

Both are safe to expose in the browser — the database is protected by RLS, not by hiding these.

```
NEXT_PUBLIC_SUPABASE_URL=https://qqxozlolglbmyiexiknu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GgarBFJ7f_AqARlZB3w4BQ_HwMoagQk
```

Locally they live in `.env.local` (git-ignored). On Vercel you paste them into project settings.

## Deploy

**1. Create an empty repo on GitHub** — no README, no .gitignore, nothing in it.

**2. Push** (run these in the project folder):

```bash
git init
git add -A
git commit -m "Morning ritual tracker"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

**3. Import on Vercel** — New Project, pick the repo. Vercel detects Next.js on its own, so leave the build settings alone. Before clicking Deploy, open **Environment Variables** and add the two above.

**4. After the first deploy**, copy the live URL and set it in Supabase:
Dashboard → Authentication → URL Configuration → **Site URL** = your `https://….vercel.app`.
Add the same URL under **Redirect URLs**. Without this, confirmation and password-reset links point at localhost.

**5. Email confirmation.** By default Supabase emails a confirmation link on signup.
Authentication → Providers → Email → turn **Confirm email** off if you'd rather sign up and go straight in. For a one-person app that's reasonable.

## Local development

```bash
npm install
npm run dev
```

Needs `.env.local` with the two variables above.

## Database

Four tables, all with row-level security keyed to `auth.uid()`:

| table | holds |
|---|---|
| `step_catalog` | the step definitions — label, spec text, order, whether it's cycled |
| `ritual_steps` | one row per step per day: status, when it happened, when it was logged, reason |
| `ritual_days` | one row per day: the note |
| `cycles` | neem cycle start date, length, phase |

`status` is a Postgres enum: `pending | done | skipped`. An unrecognised value cannot be written.

Two timestamps are kept deliberately separate:

- `happened_at` — when the thing actually happened. Editable. Every metric uses this.
- `logged_at` — when you tapped. Automatic, never edited.

When they disagree, `backfilled` is set and the row shows a "logged later" tag.

Editing a step spec — the quantity of sabja, the number of leaves — is an edit to `step_catalog`,
not a code change. No redeploy needed.

## Changing the schema later

Migrations are applied through Supabase. The ones already applied:

1. `ritual_tracker_core_schema` — tables, enum, triggers, RLS policies
2. `seed_step_catalog` — the seven steps
3. `revoke_anon_access` — removes all grants from the signed-out role
