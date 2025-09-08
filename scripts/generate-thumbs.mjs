#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content', 'blog');
const OUT_DIR = join(ROOT, 'src', 'assets', 'thumbs');

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(md|mdx)$/i.test(e.name)) out.push(p);
  }
  return out;
}

function generateSvg(seed, width = 720, height = 360) {
  const rnd = mulberry32(hashString(String(seed)));
  const grays = [18, 26, 34, 46, 58, 72];
  const palette = grays.map((l) => `hsl(0 0% ${l}%)`);
  const bgLight = 94 + Math.floor(rnd() * 4);
  const bg0 = `hsl(0 0% ${bgLight}%)`;
  const bg1 = `hsl(0 0% ${Math.max(88, bgLight - 6)}%)`;

  const shapesCount = 4 + Math.floor(rnd() * 3);
  const exX = (pad = 0.35) => -width * pad + rnd() * (width * (1 + 2 * pad));
  const exY = (pad = 0.35) => -height * pad + rnd() * (height * (1 + 2 * pad));

  // Randomly choose which shape will be the accent color
  const accentShapeIndex = Math.floor(rnd() * shapesCount);

  const shapes = Array.from({ length: shapesCount }).map((_, index) => {
    // Use accent color for the chosen shape, grayscale for others
    const isAccentShape = index === accentShapeIndex;
    const tone = isAccentShape ? 'var(--accent)' : palette[Math.floor(rnd() * palette.length)];
    const opacity = (0.45 + rnd() * 0.35).toFixed(2);
    const t = rnd();
    if (t < 0.4) {
      const r = Math.max(width, height) * (0.25 + rnd() * 0.35);
      return { type: 'circle', cx: exX(), cy: exY(), r, tone, opacity, isAccent: isAccentShape };
    } else if (t < 0.75) {
      const w = Math.max(width, height) * (0.35 + rnd() * 0.4);
      const h = Math.max(width, height) * (0.18 + rnd() * 0.3);
      const x = exX();
      const y = exY();
      const rot = Math.floor(rnd() * 360);
      return { type: 'rect', x, y, w, h, rot, tone, opacity, isAccent: isAccentShape };
    } else {
      const ptsCount = 3 + Math.floor(rnd() * 2);
      const points = Array.from({ length: ptsCount }).map(() => [exX(), exY()]);
      return { type: 'poly', points, tone, opacity, isAccent: isAccentShape };
    }
  });

  const defs = `
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg0}" />
        <stop offset="100%" stop-color="${bg1}" />
      </linearGradient>
      <clipPath id="rounded">
        <rect x="0" y="0" width="${width}" height="${height}" rx="${Math.min(width, height) * 0.06}" ry="${Math.min(width, height) * 0.06}" />
      </clipPath>
    </defs>`;

  const bg = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-grad)" />`;

  const body = shapes
    .map((s) => {
      if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.tone}" opacity="${s.opacity}" />`;
      if (s.type === 'rect')
        return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rot})"><rect x="${-s.w / 2}" y="${-s.h / 2}" width="${s.w}" height="${s.h}" fill="${s.tone}" opacity="${s.opacity}"/></g>`;
      return `<polygon points="${s.points.map((p) => p.join(',')).join(' ')}" fill="${s.tone}" opacity="${s.opacity}" />`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Abstraktný geometrický náhľad">
  ${defs}
  <g clip-path="url(#rounded)">
    ${bg}
    ${body}
  </g>
</svg>`;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const files = await walk(CONTENT_DIR);
  await ensureDir(OUT_DIR);
  for (const f of files) {
    const rel = relative(CONTENT_DIR, f).replace(/\\/g, '/');
    const slug = rel.replace(/\.(md|mdx)$/i, '');
    const outPath = join(OUT_DIR, `${slug}.svg`);
    await ensureDir(dirname(outPath));
    const svg = generateSvg(slug, 720, 360);
    await fs.writeFile(outPath, svg, 'utf8');
    // eslint-disable-next-line no-console
    console.log('Generated', outPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});