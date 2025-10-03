# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/` — Route files (`.astro`, `.js`) in kebab-case (e.g., `about.astro`).
- `src/components/` — Reusable Astro components in PascalCase (e.g., `Header.astro`).
- `src/layouts/` — Page/layout shells used by content and pages.
- `src/content/` — Markdown/MDX content (e.g., `src/content/blog/*.md[x]`).
- `src/assets/` — Images and static assets referenced by components/content.
- `src/styles/` — Global and component styles (e.g., `global.css`).
- `public/` — Static files copied as-is to the site root.
- `dist/` — Production build output (generated). Do not edit.

## Build, Test, and Development Commands
- `nvm use` — Use Node.js 20 (per `.nvmrc`).
- `npm ci` — Clean install dependencies for CI/repeatable builds.
- `npm run dev` — Start Astro dev server with hot reload.
- `npm run build` — Create production build into `dist/`.
- `npm run preview` — Serve the production build locally.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF-8; LF line endings.
- File naming: pages in kebab-case; components in PascalCase; TypeScript files camelCase.
- Content: blog posts in `src/content/blog/` as `.md` or `.mdx` with frontmatter:

  ```md
---
title: "Základy kritického myslenia"
description: "Úvod do kritického myslenia a jeho kľúčových zručností"
pubDate: "Sep 08 2025"
author: "Lukas Cech"
tags:
  - "kritické myslenie"
---
  ```
- TypeScript: strict mode (see `tsconfig.json`); prefer explicit exports.
- Images: place under `src/assets/`; reference via import for optimized handling. But we prefer using our svg generator in scripts/generate-thumbs.mjs

## Testing Guidelines
- No test suite configured yet. If adding tests, prefer Playwright for E2E and Vitest for unit tests. Place tests under `tests/` with `*.spec.ts` naming. Add an `npm test` script when introduced.

## Branching & PR Workflow
- Create a new Git branch for every change (content or code); never commit directly to the default branch (`master` in this repo).
- Suggested naming: `content/<slug>` for posts, `feat/<scope>` for features, `fix/<scope>` for fixes.
- Example (new post): `git checkout -b content/zaklady-kritickeho-myslenia` → add files under `src/content/blog/` → `git push -u origin content/zaklady-kritickeho-myslenia` → open a PR for review.
- Codex will follow this flow: branch per task, implement changes, push, then create a pull request for your review.

## Commit & Pull Request Guidelines
- Commits: concise, imperative, and descriptive (no strict convention observed). Example: `Add article on basics of critical thinking`.
- PRs: include a clear description, linked issues, and screenshots/GIFs for visual changes. Note key pages affected and steps to verify.
- Before opening a PR: run `npm run build` and `npm run preview` to sanity-check pages, links, and console errors.

## Security & Configuration Tips
- Configure integrations (Sentry, sitemap, RSS) via `astro.config.mjs`. Keep secrets in environment variables; don’t commit `.env` files.
- Client-exposed env vars must be prefixed with `PUBLIC_`.
- Large assets: optimize before committing; avoid storing build artifacts.

## Draft posts (not published in production)

- Each blog post supports a frontmatter field `status` with values `draft` or `published`.
- Default is `published` to keep current content visible - so to publish a post, it's enough to remove 'status: "draft"'
- In production builds (`npm run build` / `npm run preview` output), only posts with `status: "published"` or no status are:
  - Listed on the blog index and category pages
  - Generated as individual `/blog/[slug]/` pages
  - Included in RSS (`/rss.xml`)
- In local development (`npm run dev`), drafts are visible so you can preview them.

Example frontmatter:

```md
---
title: "My Draft"
description: "Work in progress"
pubDate: "Sep 10 2025"
author: "Lukas Cech"
status: "draft"
---
```


## Language Policy
- Frontend content: Write all user-facing website copy in Slovak (sk-SK).
- Code and identifiers: Keep code identifiers and filenames in English. Comments inside code can be Slovak if they describe UI text; otherwise prefer English for technical comments.
- Assistant/PR/commits: Keep assistant messages, PR descriptions, and commit messages in English.
- Scope: Entire repository.

### Tone & Voice (Slovak)
- Always use informal second person singular in articles and UI copy: prefer "ty/teba/ti/ťa", verbs like "robíš, čítaš, pozri, skús, over" instead of formal plural "Vy/robíte/čítate". Avoid capitalized "Vy".
- Target audience - people who don't know about critical thinking, or have only a small understanding of it. People who vote for polarising leaders like the SMER party in Slovakia, because of their slogans, not real deliverables or past achievements (or lack of)

## Content Linking Rules
- When referencing "kvalitné zdroje", "spoľahlivé zdroje", "dôveryhodné zdroje" (including singular forms and close variants/synonyms), hyperlink the phrase to `/blog/ako-odlisit-spolahlive-zdroje-informacii-od-nespolahlivych/`.
- Use the phrase itself as the link text. Apply this consistently in Markdown, MDX, and inline HTML within content or components.
 - Exception (self-link): If you are editing the same article as the target (i.e., the current page’s route equals the target URL), do not create the hyperlink; leave the phrase as plain text.
 - Exception (frequent linking) - don't add any more hyperlinks if you have already placed one, for at least the next few paragraphs.

- When mentioning confirmation bias in Slovak (e.g., "konfirmačné skreslenie", "potvrdzovacie skreslenie", "potvrdzujúce skreslenie"; including singular/plural and diacritic variants), link the phrase to `/blog/zakladne-typy-zaujatosti/#konfirmacne-skreslenie`.
- Keep the exact phrase as the link text; do not add extra wording inside the link.
 - Exception (self-link): If the current article is the same as the target (`/blog/zakladne-typy-zaujatosti/` with the given anchor), do not link; keep the phrase as plain text.
- Exception (frequent linking) - don't add any more hyperlinks if you have already placed one, for at least the next few paragraphs.

## Content Formatting Rules
- Use the callout pattern for examples, tips, and short walkthroughs: wrap example blocks in `<aside class="callout callout--info">…</aside>`.
- Add a one‑sentence actionable takeaway above every section heading - summarise the section above it: place `<aside class="callout callout--tip">One clear, actionable sentence.</aside>` directly above each `h2` in articles.
- Prefer one idea per callout; lists inside callouts should use proper HTML lists (`<ul><li>…</li></ul>`) to avoid Markdown parsing issues inside HTML blocks.
- When mixing Markdown and HTML (e.g., `<aside>`, custom components), always leave a blank line after the closing HTML tag and before the next Markdown block to preserve correct Markdown rendering.

## Anchor Offset
- For in-page anchor navigation (e.g., `#konfirmacne-skreslenie`), ensure a 100px visual offset so headings aren’t hidden under sticky headers.
- Implementation guidance (preferred, in `src/styles/global.css`):
  - Add a global rule: `:is(h1,h2,h3,h4,h5,h6)[id] { scroll-margin-top: 100px; }`
  - Optionally also: `:target { scroll-margin-top: 100px; }` as a broad fallback.
- Use this convention across all pages and content where anchors are used.

## Hosting & Deployment
- Hosting: Websupport (Slovak hosting). Not using Cloudflare or Netlify.
- Deploy flow: push to GitHub, then publish build artifacts to Websupport web root.
- Build locally: `nvm use && npm ci && npm run build` → upload contents of `dist/` to the site root (or configured subdir) on Websupport via SFTP/SSH/CI.
- Tip: keep `dist/` out of git. Use CI (GitHub Actions) or a local script to rsync/upload `dist/` after each merge to `master`.

## Privacy‑Friendly Analytics (Websupport compatible)
Goal: uniques, page views, device category; minimal cookies and simple setup.

GDPR friendly or anonymous statistic preferred.

## Content Writing Style
- Write like a blogger aiming for broad understanding; prefer clear, conversational Slovak.
- It’s OK to use less-common terms, but immediately explain them in brackets in plain Slovak, e.g., "cherry-picking (vyberanie si len tých dôkazov, ktoré sa mi hodia)".
- Expand acronyms on first use with a brief bracketed explanation.
- Favor concrete examples, short paragraphs, and bullets where it improves clarity.

## Footnotes: Explain Expert Terms
- When drafting new posts, annotate terms the average reader may not understand (e.g., metaanalýza, konfidenčný interval, randomizovaná kontrolovaná štúdia).
- Use the inline footnote pattern directly in Markdown/MDX/HTML:
  - `<span class="fn" data-footnote="Krátke, zrozumiteľné vysvetlenie.">termín</span>`
- Also add recurring terms + explanations to the shared list so they’re auto‑annotated site‑wide:
  - Edit `public/footnotes-terms.json` and add entries like:
    - `{ "term": "metaanalýza", "aliases": ["meta-analýza", "metaanalyza"], "note": "…", "maxPerPage": 1 }`
- Don’t annotate inside code blocks or links. Avoid overuse: one footnote per term per page is enough.
