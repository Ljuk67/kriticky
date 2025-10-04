#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const outFile = path.join(distDir, 'search.json');

function walk(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...walk(p));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) res.push(p);
  }
  return res;
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function extractBetween(re, html) {
  const m = re.exec(html);
  return m ? m[1] : '';
}

function stripTags(html) {
  // remove script/style blocks
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // remove all tags
  s = s.replace(/<[^>]+>/g, ' ');
  // collapse whitespace
  return s.replace(/\s+/g, ' ').trim();
}

function fileToUrl(file) {
  const rel = path.relative(distDir, file).replace(/\\/g, '/');
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  if (rel === 'index.html') return '/';
  // normally Astro emits index.html per route, but fallback:
  return '/' + rel;
}

function isPost(url) { return url.startsWith('/blog/'); }

function build() {
  if (!fs.existsSync(distDir)) {
    console.error('[search] dist/ not found. Run `npm run build` first.');
    process.exit(0);
  }
  const files = walk(distDir);
  const items = [];
  for (const f of files) {
    const html = readFileSafe(f);
    if (!html) continue;
    const url = fileToUrl(f);
    // skip obvious non-content pages (assets previews etc.)
    // keep all html routes otherwise
    const title = extractBetween(/<title[^>]*>([\s\S]*?)<\/title>/i, html).trim();
    const desc = extractBetween(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i, html).trim();
    const mainHtml = extractBetween(/<main[\s\S]*?>([\s\S]*?)<\/main>/i, html) || extractBetween(/<body[\s\S]*?>([\s\S]*?)<\/body>/i, html);
    const content = stripTags(mainHtml).slice(0, 50000); // cap to keep JSON size reasonable
    items.push({
      type: isPost(url) ? 'post' : 'page',
      url,
      title: title || url,
      description: desc || '',
      content,
    });
  }
  // Sort pages after posts, posts by recency cannot be known from dist. Keep order as found.
  fs.writeFileSync(outFile, JSON.stringify(items), 'utf8');
  console.log(`[search] Wrote ${items.length} items to ${path.relative(process.cwd(), outFile)}`);
}

build();

