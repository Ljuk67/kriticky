#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content', 'blog');
const OUT_DIR = join(ROOT, 'src', 'assets', 'thumbs');
const GLOBAL_CSS = join(ROOT, 'src', 'styles', 'global.css');

async function getThemeColors() {
  try {
    const css = await fs.readFile(GLOBAL_CSS, 'utf8');
    // Extract CSS variables like: --accent: <value>; and --highlight: <value>;
    const acc = css.match(/--accent:\s*([^;]+);/);
    const hi = css.match(/--highlight:\s*([^;]+);/);
    const pu = css.match(/--secondary:\s*([^;]+);/);
    return {
      accent: acc && acc[1] ? acc[1].trim() : '#0a8d7b',
      highlight: hi && hi[1] ? hi[1].trim() : '#ffa17a',
      secondary: pu && pu[1] ? pu[1].trim() : '#8d58b8',
    };
  } catch (_) {
    // ignore and fall back
  }
  // Fallbacks
  return { accent: '#0a8d7b', highlight: '#ffa17a', secondary: '#8d58b8' };
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 44);
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

function generateSvg(seed, width = 720, height = 360, colors = { accent: '#0a8d7b', highlight: '#ffa17a', secondary: '#8d58b8' }) {
  const rnd = mulberry32(hashString(String(seed)));
  // Use only light grays to avoid heavy visuals
  const grays = [70, 75, 80, 85, 90, 93];
  const grayPalette = grays.map((l) => `hsl(0 0% ${l}%)`);
  // Gradient background: pick two lightened theme colors and a random angle
  const allBrand = [colors.accent, colors.highlight, colors.secondary];
  const pickIdx = () => Math.floor(rnd() * allBrand.length);
  let i1 = pickIdx();
  let i2 = pickIdx();
  if (i2 === i1) i2 = (i1 + 1) % allBrand.length;
  const lighten = (hex, t) => {
    const m = hex.trim().match(/^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/);
    if (!m) return hex; // fallback if not hex
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const lr = Math.round(r + (255 - r) * t);
    const lg = Math.round(g + (255 - g) * t);
    const lb = Math.round(b + (255 - b) * t);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`;
  };
  const shade = (hex, s) => {
    const m = hex.trim().match(/^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/);
    if (!m) return hex;
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const sr = Math.round(r * (1 - s));
    const sg = Math.round(g * (1 - s));
    const sb = Math.round(b * (1 - s));
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(sr)}${toHex(sg)}${toHex(sb)}`;
  };
  // Darker, more prevalent gradients: modest lightening + slight shading
  const t1 = 0.50 + rnd() * 0.20; // 0.50..0.70
  const t2 = 0.50 + rnd() * 0.20; // 0.50..0.70
  const s1 = 0.08 + rnd() * 0.10; // 0.08..0.18 shade toward black
  const s2 = 0.08 + rnd() * 0.10;
  const bg1 = shade(lighten(allBrand[i1], t1), s1);
  const bg2 = shade(lighten(allBrand[i2], t2), s2);
  const angle = Math.floor(10 + rnd() * 160); // 10..170 degrees

  // Increase density slightly: 4..6 shapes
  const shapesCount = 4 + Math.floor(rnd() * 3); // 4..6
  // Utility: small bleed generator (kept for jitter if needed)
  const exX = (pad = 0.08) => -width * pad + rnd() * (width * (1 + 2 * pad));
  const exY = (pad = 0.08) => -height * pad + rnd() * (height * (1 + 2 * pad));

  // Spread shapes across the thumbnail using a simple stratified grid
  const cols = Math.ceil(Math.sqrt(shapesCount));
  const rows = Math.ceil(shapesCount / cols);
  const cellW = width / cols;
  const cellH = height / rows;
  const centers = [];
  for (let i = 0; i < shapesCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const jx = (rnd() - 0.5) * 0.4; // jitter -0.2..0.2 of a cell
    const jy = (rnd() - 0.5) * 0.4;
    const cx = (c + 0.5 + jx) * cellW;
    const cy = (r + 0.5 + jy) * cellH;
    centers.push([cx, cy]);
  }
  // Shuffle centers so color picks don't correlate to positions
  for (let i = centers.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = centers[i];
    centers[i] = centers[j];
    centers[j] = tmp;
  }

  // Size plan: one larger shape, the rest smaller for contrast
  const bigIndex = Math.floor(rnd() * shapesCount);
  const sizeKs = Array.from({ length: shapesCount }, (_, i) =>
    i === bigIndex ? 0.60 /* anchor ~60% of canvas */ : (0.05 + rnd() * 0.07) /* 5%..12% */
  );

  // Decide which shapes use accent/highlight/secondary; rest use light grays
  const pickIndex = (taken = []) => {
    let idx = Math.floor(rnd() * shapesCount);
    let guard = 0;
    while (taken.includes(idx) && guard++ < 10) idx = Math.floor(rnd() * shapesCount);
    return idx;
  };
  const accentShapeIndex = pickIndex([]);
  const highlightShapeIndex = shapesCount > 2 ? pickIndex([accentShapeIndex]) : -1;
  const secondaryShapeIndex = shapesCount > 3 ? pickIndex([accentShapeIndex, highlightShapeIndex]) : -1;

  const shapes = Array.from({ length: shapesCount }).map((_, index) => {
    // Use accent/highlight/secondary for chosen shapes, otherwise a light gray
    const isAccentShape = index === accentShapeIndex;
    const isHighlightShape = index === highlightShapeIndex;
    const isSecondaryShape = index === secondaryShapeIndex;
    const tone = isAccentShape
      ? colors.accent
      : isHighlightShape
      ? colors.highlight
      : isSecondaryShape
      ? colors.secondary
      : grayPalette[Math.floor(rnd() * grayPalette.length)];
    const opacity = (0.28 + rnd() * 0.32).toFixed(2); // 0.28..0.60
    const t = rnd();
    // Per-shape target area fraction (one big, others small)
    const areaTarget = sizeKs[index] * width * height;
    const strokeW = Math.max(1, Math.min(width, height) * (0.007 + rnd() * 0.006)); // ~2.5..4.7 on 360px
    const outlineChance = 0.35; // ~35% outlines
    if (t < 0.4) {
      // Circle: area = π r^2 ⇒ r = sqrt(area/π)
      const r = Math.sqrt(areaTarget / Math.PI);
      const [cx, cy] = centers[index];
      const outline = rnd() < outlineChance;
      return { type: outline ? 'ring' : 'circle', cx, cy, r, tone, opacity, strokeW, isAccent: isAccentShape };
    } else if (t < 0.8) {
      // Rectangle with random aspect; w*h = areaTarget
      const ratio = 0.6 + rnd() * 1.4; // 0.6..2.0
      const w = Math.sqrt(areaTarget * ratio);
      const h = areaTarget / w;
      const [x, y] = centers[index];
      const rot = Math.floor(rnd() * 360);
      const outline = rnd() < outlineChance;
      return { type: outline ? 'rect-outline' : 'rect', x, y, w, h, rot, tone, opacity, strokeW, isAccent: isAccentShape };
    } else {
      // Irregular polygon sized by area target
      const n = 5 + Math.floor(rnd() * 3); // 5..7 points
      const Rreg = Math.sqrt((2 * areaTarget) / (n * Math.sin((2 * Math.PI) / n)));
      const [cx, cy] = centers[index];
      const baseRot = rnd() * 2 * Math.PI;
      const jitter = 0.25; // ±25% radius jitter
      const points = Array.from({ length: n }).map((__, i) => {
        const a = baseRot + (i * 2 * Math.PI) / n;
        const rj = Rreg * (1 - jitter + rnd() * 2 * jitter);
        return [cx + rj * Math.cos(a), cy + rj * Math.sin(a)];
      });
      const outline = rnd() < outlineChance;
      return { type: outline ? 'poly-outline' : 'poly', points, tone, opacity, strokeW, isAccent: isAccentShape };
    }
  });

  const defs = `
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="${width}" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="rotate(${angle}, ${width/2}, ${height/2})">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
      <clipPath id="rounded">
        <rect x="0" y="0" width="${width}" height="${height}" rx="${Math.min(width, height) * 0.06}" ry="${Math.min(width, height) * 0.06}" />
      </clipPath>
    </defs>`;

  const bg = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-grad)" />`;

  const body = shapes
    .map((s) => {
      if (s.type === 'circle') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.tone}" opacity="${s.opacity}" />`;
      if (s.type === 'ring') return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="none" stroke="${s.tone}" stroke-width="${s.strokeW}" opacity="${s.opacity}" />`;
      if (s.type === 'rect')
        return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rot})"><rect x="${-s.w / 2}" y="${-s.h / 2}" width="${s.w}" height="${s.h}" fill="${s.tone}" opacity="${s.opacity}"/></g>`;
      if (s.type === 'rect-outline')
        return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rot})"><rect x="${-s.w / 2}" y="${-s.h / 2}" width="${s.w}" height="${s.h}" fill="none" stroke="${s.tone}" stroke-width="${s.strokeW}" stroke-linejoin="round" opacity="${s.opacity}"/></g>`;
      if (s.type === 'poly')
        return `<polygon points="${s.points.map((p) => p.join(',')).join(' ')}" fill="${s.tone}" opacity="${s.opacity}" />`;
      if (s.type === 'poly-outline')
        return `<polygon points="${s.points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${s.tone}" stroke-width="${s.strokeW}" stroke-linejoin="round" opacity="${s.opacity}" />`;
      return '';
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
  const theme = await getThemeColors();
  const files = await walk(CONTENT_DIR);
  await ensureDir(OUT_DIR);
  // Always generate a text-free default placeholder as well
  {
    const defPath = join(OUT_DIR, 'default.svg');
    const defSvg = generateSvg('default', 720, 360, theme);
    await fs.writeFile(defPath, defSvg, 'utf8');
    // eslint-disable-next-line no-console
    console.log('Generated', defPath);
  }
  for (const f of files) {
    const rel = relative(CONTENT_DIR, f).replace(/\\/g, '/');
    const slug = rel.replace(/\.(md|mdx)$/i, '');
    const outPath = join(OUT_DIR, `${slug}.svg`);
    await ensureDir(dirname(outPath));
    const svg = generateSvg(slug, 720, 360, theme);
    await fs.writeFile(outPath, svg, 'utf8');
    // eslint-disable-next-line no-console
    console.log('Generated', outPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
