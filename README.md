# dilxhan.com

Personal portfolio. Single viewport, no scroll, theme-aware hero
animation, command palette with an easter-egg dictionary, all
content driven by D1 (so an admin portal can be added later
without restructuring anything).

## Stack
- **Cloudflare Pages** — hosts the static frontend (`public/`)
- **Cloudflare Pages Functions** — the API (`functions/api/*.js`)
- **Cloudflare D1** — SQLite-compatible database for all content

## First-time setup (run these yourself, in order)

```bash
npm install
```

### 1. Log in to Cloudflare via Wrangler
```bash
npx wrangler login
```
Opens a browser window to authorize. One-time.

### 2. Create the D1 database
```bash
npx wrangler d1 create dilxhan-db
```
This prints a `database_id`. Copy it into `wrangler.toml`,
replacing `REPLACE_WITH_REAL_DATABASE_ID`.

### 3. Run the migration (creates tables) — remote, since Pages Functions read from the remote DB
```bash
npx wrangler d1 execute dilxhan-db --remote --file=./migrations/0001_init.sql
```

### 4. Seed your real content
```bash
npx wrangler d1 execute dilxhan-db --remote --file=./migrations/0002_seed.sql
```

### 5. Connect this repo to Cloudflare Pages (git auto-deploy)
In the Cloudflare dashboard: Workers & Pages → Create → Pages →
Connect to Git → select this repo → set build output directory
to `public` → deploy.

Then in the Pages project settings → Functions → D1 database
bindings: bind variable name `DB` to the `dilxhan-db` database.
This is required for Pages Functions in the dashboard to see the
database (wrangler.toml's binding covers local dev only).

### 6. Point dilxhan.com at the Pages project
In the Pages project → Custom domains → Add → dilxhan.com.
Since DNS already lives in Cloudflare, this is a couple of clicks,
no manual record-copying needed.

## Local development
```bash
npm run dev
```
Runs the site locally with the API backed by a local D1 replica.
To seed the *local* DB for testing:
```bash
npm run db:migrate:local
npm run db:seed:local
```

## Updating content later
Don't edit `migrations/0002_seed.sql` after it's been run once —
write a new migration file instead (e.g. `0003_update.sql`) with
INSERT/UPDATE statements, and run it the same way. This keeps a
clean history of changes, which matters once an admin portal is
added (it'll be doing the same kind of writes, just through a UI).

## Lookup logging (added in 0003_lookup_log.sql)
Every word typed into the command prompt — hit or miss — is now
logged to a `lookup_log` table. Run the new migration once against
your real database to add it:

```bash
npx wrangler d1 execute dilxhan-db --remote --file=./migrations/0003_lookup_log.sql
```

(Run with `--local` too if you want this in your local dev database.)

To see what people are actually typing, visit `/api/dictionary/stats`
on your deployed site (not linked anywhere in the UI — it's just a
data endpoint for you to check periodically). Add `?misses_only=1`
to see only words that never matched anything, which is the most
useful view for deciding what to add to the dictionary next.

## Hobby projects now match by title (added in 0004)
Run this migration too:

```bash
npx wrangler d1 execute dilxhan-db --remote --file=./migrations/0004_drop_hobby_dictionary_entries.sql
```

Typing a hobby project's name in the command prompt used to require
a manually-set `dictionary_key` slug to match exactly — which broke
if you typed the title with spaces/capitalization instead of the
slug (e.g. typing "Extension One" didn't match `extensionone`).

That's fixed now: **hobby projects are matched by their title,
normalized automatically** (lowercased, spaces/punctuation stripped).
There's no slug to set or keep in sync anymore.

**To add a new hobby project**, just insert one row:

```sql
INSERT INTO hobby_projects (title, description, url, icon, sort_order)
VALUES ('My New Thing', 'A short description.', 'https://example.com', 'code', 4);
```

Typing "My New Thing", "my new thing", or "MyNewThing" in the command
prompt will all correctly pulse that tile — no second insert, no
dictionary entry, no manual key. The `dictionary_key` column still
exists on the table but is no longer read by the API; leave it blank
on new rows.
