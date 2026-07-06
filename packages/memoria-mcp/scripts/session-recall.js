#!/usr/bin/env node
/** Build Memoria recall context for sessionStart hook (stdout JSON + vault file). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { dbPath, vaultPath } from '../src/config.js';
import { MemoryStore } from '../src/store.js';

const DEFAULT_ENTITIES = ['erwin pangilinan', 'memory project'];
const RECALL_QUERY = 'preferences facts project';
const RECALL_LIMIT = 6;

export async function buildSessionContext(store, entities = DEFAULT_ENTITIES) {
  const lines = [
    '# Memoria session context',
    '',
    'Auto-recalled at session start. Prefer this over chat history for durable facts.',
    '',
  ];
  const seen = new Set();

  for (const name of entities) {
    const { entity, memories } = store.entity(name);
    if (!entity?.name || !memories.length) continue;
    lines.push(`## ${entity.name}`);
    for (const m of memories.slice(0, 5)) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      lines.push(`- (${m.type}) ${m.content} — \`${m.vault_path}\``);
    }
    lines.push('');
  }

  const hits = await store.recall(RECALL_QUERY, RECALL_LIMIT);
  if (hits.length) {
    lines.push('## Recent relevant');
    for (const m of hits) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      lines.push(`- (${m.type}) ${m.content} — \`${m.vault_path}\``);
    }
    lines.push('');
  }

  if (seen.size === 0) lines.push('_No memories stored yet._', '');
  return lines.join('\n').trim();
}

async function main() {
  const entities = (process.env.MEMORIA_SESSION_ENTITIES || DEFAULT_ENTITIES.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const store = new MemoryStore(dbPath(), vaultPath());
  const context = await buildSessionContext(store, entities);
  const vault = vaultPath();
  const outPath = join(vault, '.memoria/session-context.md');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${context}\n`, 'utf8');

  process.stdout.write(JSON.stringify({ additional_context: context }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
