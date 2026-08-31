# Get It Done

A small shared kanban board for a team of friends. Static frontend on GitHub
Pages, data in Supabase. No build step, no npm, no CI — the files you see are
the files that get served.

```
index.html    markup
styles.css    styling (light + dark)
app.js        all the logic (~300 lines)
config.js     your Supabase URL + anon key, and your column names
schema.sql    run once in Supabase to create the tables and access rules

dev-preview.html + dev-mock.js
              the same UI backed by fake in-memory data, so you can poke at
              layout and interactions without touching the real board
```

## How it hangs together

GitHub Pages can only serve static files, so the board itself lives in
Supabase: a `cards` table, plus an `allowed_emails` table that decides who is
allowed to touch it. Sign-in is a one-time email link — no passwords stored
anywhere. Postgres row-level security enforces access on the server, so it does
not matter that the page and the anon key are public.

Changes broadcast over Supabase Realtime, so a card someone drags moves on
everyone else's screen a moment later.

## Setup

**1. Create the Supabase project**

- Sign up at <https://supabase.com> and create a project (free tier is plenty).
- Open the **SQL Editor**, paste in all of `schema.sql`, and run it.
- Open the **Table Editor** → `allowed_emails` and insert one row per person,
  including yourself. Anyone not listed here can sign in but will see nothing.

**2. Point the app at it**

- In Supabase: **Project Settings → Data API** for the project URL, and
  **Project Settings → API Keys** for the `anon` / publishable key.
- Paste both into `config.js`.
- The anon key is meant to be public — committing it is fine. Never commit the
  `service_role` key; it bypasses every access rule in `schema.sql`.

**3. Put it on GitHub Pages**

- Create a repo on GitHub and push this directory to it.
- Repo **Settings → Pages** → Source: *Deploy from a branch*, branch `main`,
  folder `/ (root)`. Your URL will be
  `https://<username>.github.io/<repo>/`.

**4. Tell Supabase about that URL**

Magic links only work if Supabase recognises where they're going.
**Authentication → URL Configuration**:

- *Site URL*: your Pages URL
- *Redirect URLs*: add your Pages URL, and `http://localhost:8000/` if you want
  to run it locally

Reload the page, sign in, and you have a board.

## Running it locally

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>. ES modules need a real server — opening
`index.html` from the filesystem won't work.

To work on the UI without a Supabase project at all, open
<http://localhost:8000/dev-preview.html>: it swaps in `dev-mock.js` via an
import map and runs the real `app.js` against fake data.

## Notes

- The free Supabase tier pauses projects after a week of no activity. A daily
  standup habit is enough to keep it awake; otherwise you unpause it from the
  dashboard.
- Columns are defined in `config.js`. Renaming a column's `id` orphans existing
  cards in it, so update their `status` in the Table Editor if you do.
- Cards are ordered by a fractional `position`, so moving one card only writes
  one row.
