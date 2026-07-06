#!/usr/bin/env node
/** ponytail: one-shot assert — fails if Phase 4 UX artifacts are missing or invalid. */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  'packages/memoria-mcp/src/graph.js',
  'packages/memoria-mcp/src/reindex.js',
  'packages/memoria-mcp/src/consolidate.js',
  'packages/memoria-mcp/src/ignore.js',
  'packages/memoria-mcp/scripts/log-session.js',
  'vault/.memoriaignore.example',
  '.cursor/hooks.json',
  '.cursor/hooks/memoria-session-log.sh',
];

for (const rel of required) {
  if (!existsSync(join(root, rel))) throw new Error(`missing: ${rel}`);
}

const hooks = JSON.parse(readFileSync(join(root, '.cursor/hooks.json'), 'utf8'));
if (!hooks.hooks?.sessionEnd?.some((h) => h.command?.includes('memoria-session-log'))) {
  throw new Error('.cursor/hooks.json: sessionEnd memoria hook missing');
}

const index = readFileSync(join(root, 'packages/memoria-mcp/src/index.js'), 'utf8');
for (const tool of ['memoria_graph', 'memoria_daily', 'memoria_reindex', 'memoria_consolidate']) {
  if (!index.includes(tool)) throw new Error(`index.js: missing ${tool}`);
}

console.log('check-phase4: ok');
