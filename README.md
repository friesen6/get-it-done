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
Supabase, in a `cards` table.

Access is one shared team code. Everyone signs in as the same account, so
there are no per-person invites and no emails are ever sent. The code is a
Supabase account password: stored hashed, checked by Postgres, and never
present in the page. A wrong code gets no session, and without a session
row-level security refuses every read and write — so it does not matter that
the page and the anon key are public.

The one thing holding this up is that **public signups must stay disabled** in
the Supabase dashboard. If anyone can register an account, they get a valid
session and walk straight past the code.

The tradeoff of a shared account: the board cannot tell who did what. The
`assignee` field is free text, which is usually enough for a small team.

Changes broadcast over Supabase Realtime, so a card someone drags moves on
everyone else's screen a moment later.

## Setup

**1. Create the Supabase project**

- Sign up at <https://supabase.com> and create a project (free tier is plenty).
- Open the **SQL Editor**, paste in all of `schema.sql`, and run it.
- **Authentication → Users → Add user**: email `team@getitdone.team` (or
  whatever you set as `TEAM_ACCOUNT` in `config.js`), password = the team code
  you'll share. Tick **Auto Confirm User**. Nobody types this address; the app
  supplies it and only asks for the code.
- **Authentication → Sign In / Providers → Email**: turn **off** new user
  signups. This is not optional — see above.
- Pick a long code. It is the only thing standing between the internet and
  your board, so favour a passphrase over a short word.

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

## Changing the code

Authentication → Users → the team account → reset its password. Everyone's
existing sessions keep working until they sign out; new unlocks need the new
code.

## Notes

- No email is ever sent, so Supabase's email rate limits don't apply.
- The free Supabase tier pauses projects after a week of no activity. A daily
  standup habit is enough to keep it awake; otherwise you unpause it from the
  dashboard.
- The board follows your system light/dark setting by default. The toggle in
  the top bar pins a mode, remembered per browser in `localStorage`. Cards are
  pink in light mode; dark mode is unchanged.
- Columns are defined in `config.js`. Renaming a column's `id` orphans existing
  cards in it, so update their `status` in the Table Editor if you do.
- Cards are ordered by a fractional `position`, so moving one card only writes
  one row.
