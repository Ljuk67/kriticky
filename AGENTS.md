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
- Images: place under `src/assets/`; reference via import for optimized handling. But we prefer using our svg generator in /src/scripts/

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

## Language Policy
- Frontend content: Write all user-facing website copy in Slovak (sk-SK).
- Code and identifiers: Keep code identifiers and filenames in English. Comments inside code can be Slovak if they describe UI text; otherwise prefer English for technical comments.
- Assistant/PR/commits: Keep assistant messages, PR descriptions, and commit messages in English.
- Scope: Entire repository.
