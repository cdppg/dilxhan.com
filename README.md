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
