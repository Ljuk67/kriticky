#!/usr/bin/env node
// Remind if link checker hasn't been run recently.
// Usage:
//   node scripts/linkcheck-reminder.mjs [--max-days 30]
// Exit code: 0 if fresh, 1 if stale/missing.

/* eslint-disable no-console */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = { maxDays: 30 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--max-days') { args.maxDays = Number(argv[++i] ?? NaN); continue; }
    if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/linkcheck-reminder.mjs [--max-days 30]');
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.maxDays) || args.maxDays <= 0) args.maxDays = 30;
  return args;
}

async function run() {
  const { maxDays } = parseArgs(process.argv.slice(2));
  const file = path.resolve('.linkcheck', 'last-run.json');
  let ranAt;
  try {
    const raw = await readFile(file, 'utf8');
    const data = JSON.parse(raw);
    ranAt = new Date(data.ranAt);
    if (Number.isNaN(+ranAt)) throw new Error('Invalid timestamp');
  } catch {
    // Fall back to file mtime if exists
    try {
      const st = await stat(file);
      ranAt = st.mtime;
    } catch {
      console.log('Link checker has not been run yet. Run: npm run check:site');
      process.exit(1);
    }
  }

  const now = new Date();
  const diffDays = Math.floor((now - ranAt) / (1000 * 60 * 60 * 24));
  if (diffDays > maxDays) {
    console.log(`It has been ${diffDays} days since last link check. Run: npm run check:site`);
    process.exit(1);
  }
  console.log(`Last link check: ${diffDays} day(s) ago. All good (< ${maxDays} days).`);
}

run().catch((e) => { console.error(e); process.exit(1); });

