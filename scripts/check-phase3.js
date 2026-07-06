#!/usr/bin/env node
/** ponytail: one-shot assert — fails if Phase 3 skill/config artifacts are missing or invalid. */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const required = [
  '.mcp.json',
  '.cursor/mcp.json.example',
  'CLAUDE.md',
  '.cursor/skills/memoria/SKILL.md',
  '.cursor/skills/memoria/reference.md',
  '.cursor/skills/memoria/examples.md',
];

for (const rel of required) {
  const path = join(root, rel);
  if (!existsSync(path)) throw new Error(`missing: ${rel}`);
}

const mcp = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
if (!mcp.mcpServers?.memoria?.args?.[0]?.includes('memoria-mcp/run.sh')) {
  throw new Error('.mcp.json: memoria server entry invalid');
}

const skill = readFileSync(join(root, '.cursor/skills/memoria/SKILL.md'), 'utf8');
if (!skill.startsWith('---\nname: memoria')) throw new Error('SKILL.md: missing frontmatter');

console.log('check-phase3: ok');
