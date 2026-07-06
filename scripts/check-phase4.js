#!/usr/bin/env node
/** ponytail: one-shot assert — fails if Phase 4 UX artifacts are missing or invalid. */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cursorDir = join(homedir(), '.cursor');

const required = [
  'packages/memoria-mcp/src/graph.js',
  'packages/memoria-mcp/src/reindex.js',
  'packages/memoria-mcp/src/consolidate.js',
  'packages/memoria-mcp/src/ignore.js',
  'packages/memoria-mcp/scripts/session-recall.js',
  'packages/memoria-mcp/scripts/log-session.js',
  'vault/.memoriaignore.example',
  'scripts/install-global-cursor.sh',
];

for (const rel of required) {
  if (!existsSync(join(root, rel))) throw new Error(`missing: ${rel}`);
}

const globalHooks = join(cursorDir, 'hooks.json');
if (!existsSync(globalHooks)) {
  throw new Error('missing global hooks — run scripts/install-global-cursor.sh');
}
const hooks = JSON.parse(readFileSync(globalHooks, 'utf8'));
if (!hooks.hooks?.sessionEnd?.some((h) => h.command?.includes('memoria-session-log'))) {
  throw new Error('~/.cursor/hooks.json: sessionEnd memoria hook missing');
}
if (!hooks.hooks?.sessionStart?.some((h) => h.command?.includes('memoria-session-start'))) {
  throw new Error('~/.cursor/hooks.json: sessionStart memoria hook missing');
}

const index = readFileSync(join(root, 'packages/memoria-mcp/src/create-server.js'), 'utf8');
for (const tool of ['memoria_graph', 'memoria_daily', 'memoria_reindex', 'memoria_consolidate']) {
  if (!index.includes(tool)) throw new Error(`index.js: missing ${tool}`);
}

console.log('check-phase4: ok');
