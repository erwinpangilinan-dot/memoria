import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadIgnorePatterns(vaultRoot) {
  const file = join(vaultRoot, '.memoriaignore');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

export function isIgnored(relPath, patterns) {
  if (patterns.length === 0) return false;
  const norm = relPath.replace(/\\/g, '/');
  for (const raw of patterns) {
    const pat = raw.replace(/\\/g, '/');
    if (pat.endsWith('/')) {
      const prefix = pat.slice(0, -1);
      if (norm === prefix || norm.startsWith(`${prefix}/`)) return true;
      continue;
    }
    if (pat.includes('*')) {
      const re = new RegExp(
        `^${pat.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`
      );
      if (re.test(norm)) return true;
      continue;
    }
    if (norm === pat || norm.endsWith(`/${pat}`)) return true;
  }
  return false;
}
