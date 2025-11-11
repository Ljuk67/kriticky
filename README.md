# Kritické myslenie v praxi

Tento projekt je osobný blog o kritickom myslení a jeho využití v každodennom živote.  
Cieľom je ukázať, ako odlíšiť fakty od hoaxov, odhaliť manipulatívne techniky a nenechať sa nachytať populizmom.

Upevniť a rozšíriť kritické myslenie u bežných ľudí.

## Technológie
- [Astro](https://astro.build/) – statický generátor webov, rýchle načítavanie
- Markdown/MDX – články sú písané v jednoduchom formáte
- Pagefind – vyhľadávanie priamo na stránke
- giscus – komentáre čitateľov cez GitHub Discussions
<hr/>

## Kontrola odkazov (link checker)
- Po každom build-e beží automatická kontrola odkazov (postbuild). Build nezlyhá; iba vypíše nefunkčné odkazy.
- Ručné spustenie:
  - `npm run check:site` – skontroluje odkazy v `dist/` (interné, offline).
  - `npm run check:site -- --external` – pridá kontrolu externých odkazov (HTTP statusy).
  - `npm run check:site -- --check-anchors` – overí aj `#kotvy` (ID) na cieľových stránkach.
- Pripomienka raz za čas: `npm run linkcheck:remind` upozorní, ak kontrola neprebehla dlhšie než 30 dní.

## Poznámky ako pop up (footnotes)
- Časté pojmy a vysvetlenia udržuj v `public/footnotes-terms.json` (automaticky sa aplikujú naprieč webom).
- V článkoch používaj inline formát: `<span class="fn" data-footnote="Krátke vysvetlenie.">termín</span>`.
- Nepoužívaj vnútri odkazov ani kódu; zvyčajne stačí jedna poznámka na termín a stránku.

## Komentáre s e‑mailovým potvrdením (Supabase)
- Zoznam komentárov sa číta priamo zo Supabase (len schválené `is_approved=true`).
- Odoslanie ide cez server `public/api/comments/submit.php`:
  - Vytvorí záznam ako neschválený, vygeneruje `verify_token` a pošle e‑mail s potvrdzovacím odkazom.
  - Po kliknutí na odkaz `public/api/comments/verify.php?token=...` sa komentár schváli a príde notifikácia na `mysli@kriticky.sk`.

### Nastavenie
1) Supabase (env):
   - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (pre čítanie zoznamu)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (serverové vkladanie a schvaľovanie)
2) SMTP (env):
   - `SMTP_HOST=smtp.m1.websupport.sk`, `SMTP_PORT=587`, `SMTP_SECURE=starttls`
   - `SMTP_USER=admin@kriticky.sk`, `SMTP_PASS=...`, `SMTP_FROM=admin@kriticky.sk`
   - `ADMIN_NOTIFY_TO=mysli@kriticky.sk`
3) Schéma (pozri `scripts/sql/comments_migration.sql`):
   - Potrebné stĺpce: `is_approved`, `verify_token`, `verify_expires_at`, `verified_at`.
   - RLS: povoliť `SELECT` len pre `is_approved=true`; `INSERT/UPDATE` len cez service role.
