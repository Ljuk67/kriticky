#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec);
const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content', 'blog');
const THUMBS_DIR = join(ROOT, 'src', 'assets', 'thumbs');
const GLOBAL_CSS = join(ROOT, 'src', 'styles', 'global.css');
const GEN_SCRIPT = join(ROOT, 'scripts', 'generate-thumbs.mjs');
const STAMP = join(THUMBS_DIR, '.last-run');

async function statOrNull(p) {
  try { return await fs.stat(p); } catch { return null; }
}

async function listContentFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listContentFiles(p)));
    } else if (/\.(md|mdx)$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

async function latestMTime(paths) {
  let latest = 0;
  for (const p of paths) {
    const s = await statOrNull(p);
    if (s && s.mtimeMs > latest) latest = s.mtimeMs;
  }
  return latest;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  await ensureDir(THUMBS_DIR);
  const files = await listContentFiles(CONTENT_DIR);
  if (files.length === 0) return;

  const stamp = await statOrNull(STAMP);
  const lastRun = stamp ? stamp.mtimeMs : 0;
  const now = Date.now();

  // Consider content, theme CSS (for --accent changes), and the generator script itself
  const contentLatest = await latestMTime([...files, GLOBAL_CSS, GEN_SCRIPT]);

  // Rerun if: any content newer than last run, or last run older than 24h, or any thumb missing
  const DAY = 24 * 60 * 60 * 1000;
  let needsRun = !stamp || (now - lastRun) > DAY || contentLatest > lastRun;

  if (!needsRun) {
    // Check for missing thumbs by slug
    for (const f of files) {
      const base = f.replace(/.*\/(.+?)\.(md|mdx)$/i, '$1');
      const thumbPath = join(THUMBS_DIR, `${base}.svg`);
      const s = await statOrNull(thumbPath);
      if (!s) { needsRun = true; break; }
    }
  }

  if (!needsRun) return;

  console.log('[gen:thumbs] Changes detected — generating SVG thumbnails...');
  await exec('node scripts/generate-thumbs.mjs');
  await fs.writeFile(STAMP, new Date().toISOString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
