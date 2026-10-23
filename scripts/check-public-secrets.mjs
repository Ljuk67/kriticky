import { readdir, readFile, lstat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const failures = [];
async function scan(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) {
    failures.push(`${path}: symlink in public artifacts requires review`);
    return;
  }
  if (stat.isDirectory()) {
    for (const name of await readdir(path)) await scan(join(path, name));
    return;
  }
  if (/^(?:\.env(?:\..*)?|config\.local\.php|server\.php)$/.test(basename(path))) {
    failures.push(`${path}: private configuration filename`);
  }
  const text = await readFile(path, 'utf8');
  if (/sb_secret_[A-Za-z0-9_-]+/.test(text)) failures.push(`${path}: secret API key`);
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(match[1], 'base64url').toString()).role === 'service_role') {
        failures.push(`${path}: service_role JWT`);
        break;
      }
    } catch { /* Non-JWT text is not a credential. */ }
  }
}
for (const path of process.argv.slice(2)) await scan(path);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('Public artifact credential check passed.');
