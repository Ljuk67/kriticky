# Credential rotation and deployment

## Configuration

Astro reads `.env` at build time. Set `PUBLIC_SUPABASE_URL` and
`PUBLIC_SUPABASE_PUBLISHABLE_KEY` there. Only the publishable key belongs in HTML.
The obsolete `PUBLIC_SUPABASE_ANON_KEY` is no longer read by this code.

PHP does not automatically load this `.env`. Prefer PHP server environment
variables: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`,
`SITE_BASE_URL`, and `ADMIN_NOTIFY_TO`.

On Websupport, put `server.php` in a `private/` folder beside `web/`.
The loader finds this relative to its own location; no `.htaccess` or environment
variable is needed. This remains valid if the hosting account path changes.

Owner-confirmed web root:
`/data/d/a/dac700b2-9e49-42d1-8dd4-6417b9484211/kriticky.sk/web/`

Private configuration destination:
`/data/d/a/dac700b2-9e49-42d1-8dd4-6417b9484211/kriticky.sk/private/server.php`

For a different layout, `KRITICKY_CONFIG_FILE` can override the path. Environment
values override file values. A missing default file supplies no configuration;
an invalid explicit path or public config file is rejected. PHP must be able to
read the file; use mode 0600 when PHP runs as its owner and 0700 for its parent.
Keep it outside **every served web root**. Never upload the root `.env`, `.private/`,
or real configuration into `web/`. Use `config/server.example.php` as a template.

The local `.private/server.php` contains the replacement credentials and existing
mail settings. `.private/legacy-*.php` preserves the exposed old values solely for
invalidation verification. Neither belongs in an upload of `dist/`.

## Ordered rollout

1. Create a new Supabase secret key and publishable key; leave legacy keys enabled.
2. Change the mailbox password in Websupport and set the replacement `SMTP_PASS`
   in the private configuration. Update any other mail clients using that mailbox.
3. Confirm the actual hosting web-root path, private config path, PHP version
   (PHP 8+ for this loader), and file ownership/permissions.
   Do not deploy until the private file is readable by PHP and the loader can
   locate it. A root Astro `.env` alone is insufficient.
4. Build with the new publishable key (`npm run build`). Run Betterleaks on the
   release artifacts and review all findings before upload. The built-in public
   checker covers forbidden config filenames, Supabase secret keys, service-role
   JWTs, and symlinks; it is not a replacement for Betterleaks or an SMTP-secret scan.
5. Upload the reviewed build and remove stale `/api/config.local.php` and
   `/config.local.php` from the live web root. Uploads that only overwrite files
   leave these old files behind. Remove any other public backup copies too.
6. On live, verify approved comments load. Submit a clearly labelled test comment
   to an owner-controlled mailbox, confirm receipt, follow its verification link,
   and confirm the admin notification. Check errors without sharing tokens or mail
   contents. Confirm private config and old public config URLs are not accessible.
7. Inventory other clients/integrations using legacy keys before disabling them.
   In Supabase Settings > API Keys, disable legacy keys only after all clients
   have migrated. Re-run the live checks, and verify each distinct exposed old
   credential receives an authentication rejection, using a no-row read probe.
   A network error or missing-table error is not evidence of revocation.
8. Only after rotation and live verification, plan Git history and backup cleanup.
   History rewriting and force pushes require separate explicit authorization.

Stop if configuration is unavailable, mail fails, browser requests fail, or old
credentials still work after invalidation. Repair configuration before proceeding.
Do not restore an exposed credential as a rollback. Keep legacy keys enabled only
for the short, coordinated migration window; they remain a risk until disabled.

## Local checks

```sh
php tests/server-config.php env
php tests/server-config.php missing
php tests/server-config.php private
php tests/server-config.php public
php tests/server-config.php symlink
php tests/server-config.php layout
php tests/server-config.php layout-public
node scripts/check-public-secrets.mjs public
npm run build
```

No live deployment, SMTP delivery, legacy invalidation, or Git cleanup is implied
by successful local tests. Astro's development server does not execute PHP.

Provider process: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
