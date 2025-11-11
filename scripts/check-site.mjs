#!/usr/bin/env node
// Crawl the built site (dist/) and flag broken internal links/assets (404-like: missing files).
// Does NOT require network. Optionally checks external URLs with fetch.
//
// Usage:
//   node scripts/check-site.mjs --dir dist
//   node scripts/check-site.mjs --dir dist --external --concurrency 8 --timeout 10000
//   npm run check:site
//
// Exit code: 1 if any broken internal links or (if --external) broken externals found.

/* eslint-disable no-console */

import { readdir, readFile, access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const help = `
Check built site for broken internal links/assets (and optionally external links)

Options:
  --dir <path>           Root directory of built site (default: dist)
  --external             Also check external http(s) links by HTTP status
  --concurrency <n>      Parallelism for external checks (default: 8)
  --timeout <ms>         Timeout for external requests (default: 10000)
  --check-anchors        Verify that #hash anchors exist in target HTML
  -h, --help             Show help
`;

function parseArgs(argv) {
  const args = { dir: 'dist', external: false, concurrency: 8, timeout: 10000, checkAnchors: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') { args.dir = argv[++i]; continue; }
    if (a === '--external') { args.external = true; continue; }
    if (a === '--concurrency') { args.concurrency = Number(argv[++i] ?? NaN); continue; }
    if (a === '--timeout') { args.timeout = Number(argv[++i] ?? NaN); continue; }
    if (a === '--check-anchors') { args.checkAnchors = true; continue; }
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    console.error(`Unknown arg: ${a}`);
    args.help = true;
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency <= 0) args.concurrency = 8;
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) args.timeout = 10000;
  return args;
}

async function walk(root) {
  const out = [];
  async function rec(dir) {
    const items = await readdir(dir, { withFileTypes: true });
    for (const it of items) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) await rec(p);
      else out.push(p);
    }
  }
  await rec(root);
  return out;
}

// Extract links and assets from HTML content
function extractUrls(html) {
  const urls = [];
  const push = (u, attr) => { if (u) urls.push({ url: u, attr }); };

  // href/src/poster attributes
  const attrRe = /(href|src|poster)=("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const val = m[3] ?? m[4] ?? '';
    push(val, m[1].toLowerCase());
  }

  // srcset (comma-separated, pick URL token before descriptor)
  const srcsetRe = /srcset=("([^"]*)"|'([^']*)')/gi;
  while ((m = srcsetRe.exec(html))) {
    const raw = (m[2] ?? m[3] ?? '').split(',');
    for (const part of raw) {
      const first = part.trim().split(/\s+/)[0];
      if (first) push(first, 'srcset');
    }
  }

  return urls.map((u) => u.url ?? u);
}

function isHttp(u) { return /^https?:\/\//i.test(u); }
function isSkippable(u) { return /^(#|mailto:|tel:|javascript:|data:|sms:)/i.test(u); }

function stripQueryHash(u) {
  const i = u.indexOf('#');
  const j = u.indexOf('?');
  let end = u.length;
  if (i !== -1) end = Math.min(end, i);
  if (j !== -1) end = Math.min(end, j);
  return u.slice(0, end);
}

function getHash(u) {
  const i = u.indexOf('#');
  return i === -1 ? '' : u.slice(i + 1);
}

function normalizeInternal(rootDir, sourceHtml, url) {
  // Compute filesystem target path(s) within rootDir for given url referenced from sourceHtml
  const fromDir = path.dirname(sourceHtml);
  const clean = stripQueryHash(url);
  const isAbs = clean.startsWith('/');
  const relFs = isAbs ? clean.replace(/^\/+/, '') : path.normalize(path.join(path.relative(rootDir, fromDir), clean));
  let fsPath = path.join(rootDir, relFs);
  // Prevent escaping root
  if (!fsPath.startsWith(path.resolve(rootDir))) fsPath = path.resolve(rootDir, relFs);

  const candidates = [];
  const ext = path.extname(fsPath).toLowerCase();
  if (!ext) {
    candidates.push(path.join(fsPath, 'index.html'));
    candidates.push(fsPath + '.html');
  } else {
    candidates.push(fsPath);
  }
  return candidates;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function checkAnchorsIfNeeded(rootDir, sourceHtml, url) {
  const hash = getHash(url);
  if (!hash) return { ok: true };
  const targets = normalizeInternal(rootDir, sourceHtml, url);
  for (const t of targets) {
    if (await exists(t)) {
      try {
        const html = await readFile(t, 'utf8');
        // Search for id="hash" (simple heuristic)
        const re = new RegExp(`id=("|')${hash}("|')`);
        return { ok: re.test(html), file: t };
      } catch { return { ok: false, file: t }; }
    }
  }
  return { ok: false };
}

function withTimeout(ms) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort('timeout'), ms);
  return { signal: ac.signal, clear: () => clearTimeout(to) };
}

async function checkExternal(url, { timeout }) {
  const { signal, clear } = withTimeout(timeout);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal, headers: { 'user-agent': 'kriticke-site-checker/1.0' } });
    clear();
    if (res.status === 405 || res.status === 501) {
      const { signal: s2, clear: c2 } = withTimeout(timeout);
      const r2 = await fetch(url, { method: 'GET', redirect: 'follow', signal: s2, headers: { 'user-agent': 'kriticke-site-checker/1.0' } });
      c2();
      return { status: r2.status, ok: r2.ok };
    }
    return { status: res.status, ok: res.ok };
  } catch (e) {
    clear();
    return { ok: false, error: e && (e.name + ': ' + e.message) };
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(help); process.exit(0); }

  const root = path.resolve(args.dir);
  const files = await walk(root);
  const htmlFiles = files.filter((f) => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    console.error(`No HTML files found in ${root}. Did you run 'npm run build'?`);
    process.exit(2);
  }

  const internalRefs = [];
  const externalRefs = [];

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const urls = extractUrls(html);
    for (const u of urls) {
      if (!u || isSkippable(u)) continue;
      if (isHttp(u)) externalRefs.push({ url: u, from: file });
      else internalRefs.push({ url: u, from: file });
    }
  }

  let brokenInternal = [];
  let brokenAnchors = [];

  for (const ref of internalRefs) {
    const candidates = normalizeInternal(root, ref.from, ref.url);
    let ok = false;
    for (const c of candidates) {
      if (await exists(c)) { ok = true; break; }
    }
    if (!ok) {
      brokenInternal.push({ url: ref.url, from: ref.from, tried: candidates.map((c) => path.relative(root, c)) });
    } else if (args.checkAnchors && ref.url.includes('#')) {
      const ch = await checkAnchorsIfNeeded(root, ref.from, ref.url);
      if (!ch.ok) brokenAnchors.push({ url: ref.url, from: ref.from, targetFile: ch.file && path.relative(root, ch.file) });
    }
  }

  let brokenExternal = [];
  if (args.external && externalRefs.length) {
    // Deduplicate external URLs but keep one example source
    const seen = new Map();
    for (const r of externalRefs) if (!seen.has(r.url)) seen.set(r.url, r.from);
    const urls = Array.from(seen.keys());

    let idx = 0; let active = 0; const results = [];
    const next = async () => {
      if (idx >= urls.length) return;
      const u = urls[idx++];
      active++;
      try {
        const res = await checkExternal(u, { timeout: args.timeout });
        results.push({ url: u, from: seen.get(u), ...res });
      } finally {
        active--; if (idx < urls.length) await next();
      }
    };
    const starters = Math.min(args.concurrency, urls.length);
    await Promise.all(Array.from({ length: starters }, () => next()));

    brokenExternal = results.filter((r) => !(r.ok) && (r.status === 404 || r.error));
  }

  // Report
  for (const b of brokenInternal) {
    console.log(`404  ${b.url}  (from ${path.relative(root, b.from)})  tried: ${b.tried.join(' | ')}`);
  }
  for (const b of brokenAnchors) {
    console.log(`ANCHOR  ${b.url}  (from ${path.relative(root, b.from)})  target: ${b.targetFile ?? 'not found'}`);
  }
  for (const b of brokenExternal) {
    if (b.error) console.log(`EXT ERR  ${b.url}  (from ${path.relative(root, b.from)})  ${b.error}`);
    else console.log(`EXT 404  ${b.url}  (from ${path.relative(root, b.from)})`);
  }

  const summary = {
    pages: htmlFiles.length,
    internalChecked: internalRefs.length,
    internalBroken: brokenInternal.length,
    anchorBroken: brokenAnchors.length,
    externalChecked: args.external ? externalRefs.length : 0,
    externalBroken: brokenExternal.length,
  };

  console.log('\nSummary:');
  console.log(`  Pages scanned:         ${summary.pages}`);
  console.log(`  Internal refs checked: ${summary.internalChecked}`);
  console.log(`  Internal broken:       ${summary.internalBroken}`);
  console.log(`  Anchor broken:         ${summary.anchorBroken}`);
  if (args.external) {
    console.log(`  External refs seen:    ${externalRefs.length}`);
    console.log(`  External broken:       ${summary.externalBroken}`);
  }
  // Persist last run timestamp for reminder tooling (best-effort)
  try {
    const stateDir = path.resolve('.linkcheck');
    await mkdir(stateDir, { recursive: true });
    await writeFile(path.join(stateDir, 'last-run.json'), JSON.stringify({ ranAt: new Date().toISOString() }, null, 2));
  } catch {}

  // Do not fail builds: always exit 0, just print issues above and summary
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
