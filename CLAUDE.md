# Claude's private notes on this repo

Not committed — local memory only, kept alongside AGENTS.md (which is the
public-facing agent guidelines file). This file is for things I've learned
about how the site actually works, that aren't fully written up elsewhere.

## Stack recap
- Astro 5 + Tailwind + MDX, static output to `dist/`.
- Content: `src/content/blog/*.md[x]`, 15 posts as of 2026-08-03.
- Search: Pagefind. Analytics: GoatCounter (privacy-friendly). Errors: Sentry.

## Deployment — corrected understanding
- **Not Netlify.** The `netlify.toml` at repo root is a leftover/unused.
- Real flow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml) —
  on push to `master`, GitHub Actions runs `npm ci && npm run build` (injecting
  `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` from repo secrets), then
  pushes `dist/` to Websupport.sk over **FTPS** via
  `SamKirkland/FTP-Deploy-Action`.
- `.github/workflows/deploy-ghpages.yml.bckp` is a disabled, unused GitHub
  Pages workflow — ignore it.
- Websupport hosting supports PHP, which is *why* the comments backend below
  can live as plain `.php` files under `public/api/` and get deployed as-is
  alongside the static build.

## Comments system — NOT Giscus (that was the plan, abandoned)
Custom-built: Astro/JS frontend + PHP backend on Websupport + Supabase as the
data store, with email double opt-in for spam control.

**Read path (client-side, direct to Supabase):**
- [src/components/Comments.astro](src/components/Comments.astro) renders the
  form + a `#comments-list` div carrying `data-supabase-url` /
  `data-supabase-key` (the **anon** key — safe to expose).
- [src/assets/comments-client.js](src/assets/comments-client.js) fetches
  straight from Supabase's PostgREST API:
  `GET {SUPABASE_URL}/rest/v1/comments?slug=eq.<slug>&is_approved=eq.true`.
  Anon key only ever reads approved rows — it has no insert rights (enforced
  via RLS, see migration notes below).

**Write path (goes through PHP, not Supabase directly):**
- Client posts to `/api/comments/submit.php` (PHP files under
  `public/api/comments/`, deployed as static files — this is why comments
  need a PHP-capable host, not just static hosting).
- [submit.php](public/api/comments/submit.php): honeypot + per-IP 60s
  rate-limit (temp file), validates input, inserts a **pending** row
  (`is_approved: false`) into Supabase using the **service-role key**
  (server-side only, never shipped to the browser), generates a
  `verify_token` + 48h expiry, emails the commenter a verify link via SMTP.
- [verify.php](public/api/comments/verify.php): the emailed link target.
  Checks token validity/expiry, `PATCH`es `is_approved: true`, clears the
  token, emails the site admin (`mysli@kriticky.sk`) a notification, redirects
  visitor to `/blog/<slug>/#comments`.
- [status.php](public/api/comments/status.php): diagnostic-only endpoint,
  booleans + a live read probe, no secrets leaked. Fine to leave in place.

**Config resolution** — [public/api/lib/config.php](public/api/lib/config.php):
prefers a git-ignored `public/api/config.local.php` (copy of
`config.local.sample.php`) over env vars, since Websupport's PHP hosting may
not expose an env-var UI. Holds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SITE_BASE_URL`, SMTP creds. **`config.local.php` is real, deployed, and
gitignored** — it is the actual secrets file in production, distinct from
`.env` (which only feeds the Astro build for the public anon key).

**Data model** — [scripts/sql/comments_migration.sql](scripts/sql/comments_migration.sql)
is reference SQL only (all commented out), not an applied migration file:
`comments(slug, name, email, message, is_approved, verify_token,
verify_expires_at, verified_at, created_at)`. RLS intent: `anon` can `select`
only `is_approved = true` rows and cannot `insert` at all; all writes go
through the service-role key from PHP.

**Key security property to preserve**: anon key = read-only on approved
comments; service-role key lives only in `public/api/config.local.php` on the
PHP host, never in the Astro build/client bundle. Don't suggest moving
comment writes to client-side Supabase calls — that would require exposing
write permissions to the anon key.

## Cross-checked against AGENTS.md (2026-08-03)
- Deployment section here is consistent with AGENTS.md's "Hosting &
  Deployment" — AGENTS.md describes it generically (SFTP/SSH/CI to
  Websupport, not Netlify/Cloudflare); this file just has the concrete
  mechanism (FTPS via `SamKirkland/FTP-Deploy-Action` in
  `.github/workflows/deploy.yml`).
- AGENTS.md says nothing about Supabase or the PHP comments backend — it's
  silent on this, not contradicting it. (Previously the README also said
  "giscus," which was stale/aspirational — user removed that 2026-08-03, so
  README and this file now agree: comments are the custom Supabase+PHP
  system described above, giscus was never actually used in prod.)
- Node version note resolved: AGENTS.md used to say Node 20 while `.nvmrc`
  pinned `24.14.0` / `package.json` required `>=22.12.0`. User fixed AGENTS.md
  2026-08-03 to say "Node.js 22+ (per `.nvmrc`)" — now consistent.

## Open items / things that look stale
- `netlify.toml` and `deploy-ghpages.yml.bckp` are dead weight — could be
  removed if confirmed unused (ask before deleting, per repo's destructive-edit
  policy in AGENTS.md).
- `summary.html` at repo root — unclear purpose, haven't investigated.
