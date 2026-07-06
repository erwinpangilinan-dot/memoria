import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { normalizeEntity } from './entities.js';

export function slugify(text, maxLen = 48) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (slug.slice(0, maxLen).replace(/-$/, '') || 'memory');
}

export function entityDir(entityName) {
  const n = normalizeEntity(entityName);
  if (/\bproject\b/.test(n) || n.endsWith(' project')) return 'Projects';
  return 'People';
}

export function entityPageRel(entityName) {
  return `${entityDir(entityName)}/${slugify(entityName)}.md`;
}

export function writeMemoryFile(vault, memoryType, content, importance, memoryId, entities = []) {
  const now = new Date();
  const slug = slugify(content);
  const rel =
    memoryType === 'episodic'
      ? `Episodes/${now.toISOString().slice(0, 10)}-${slug}.md`
      : `Facts/${slug}.md`;

  const path = join(vault, rel);
  mkdirSync(dirname(path), { recursive: true });

  const entityYaml =
    entities.length > 0
      ? `entities:\n${entities.map((e) => `  - ${e}`).join('\n')}\n`
      : '';

  const body = `---
id: ${memoryId}
type: ${memoryType}
importance: ${importance}
created_at: ${now.toISOString()}
${entityYaml}---

${content.trim()}
`;
  writeFileSync(path, body, 'utf8');
  return rel;
}

export function appendDailyNote(vault, memoryType, content, vaultRel) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const rel = `Memory/Daily/${date}.md`;
  const path = join(vault, rel);
  mkdirSync(dirname(path), { recursive: true });

  const time = now.toISOString().slice(11, 16);
  const line = `- ${time} (${memoryType}) ${content.trim()} → [[${vaultRel.replace(/\.md$/, '')}|note]]`;

  if (!existsSync(path)) {
    writeFileSync(
      path,
      `---
date: ${date}
---

# ${date}

## Log

${line}
`,
      'utf8'
    );
    return rel;
  }

  const existing = readFileSync(path, 'utf8');
  if (existing.includes(`id: ${vaultRel}`) || existing.includes(vaultRel)) return rel;

  const updated = existing.includes('## Log\n')
    ? existing.replace('## Log\n', `## Log\n\n${line}\n`)
    : `${existing.trim()}\n\n## Log\n\n${line}\n`;
  writeFileSync(path, updated, 'utf8');
  return rel;
}

export function ensureEntityPage(vault, entityName, memoryVaultRel) {
  const rel = entityPageRel(entityName);
  const path = join(vault, rel);
  mkdirSync(dirname(path), { recursive: true });

  const title = entityName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const link = `- [[${memoryVaultRel.replace(/\.md$/, '')}|${memoryVaultRel}]]`;

  if (!existsSync(path)) {
    writeFileSync(
      path,
      `---
type: entity
name: ${normalizeEntity(entityName)}
---

# ${title}

## Linked memories

${link}
`,
      'utf8'
    );
    return rel;
  }

  const existing = readFileSync(path, 'utf8');
  if (existing.includes(memoryVaultRel)) return rel;

  const section = '## Linked memories';
  const updated = existing.includes(section)
    ? existing.replace(section, `${section}\n\n${link}`)
    : `${existing.trim()}\n\n${section}\n\n${link}\n`;
  writeFileSync(path, updated, 'utf8');
  return rel;
}

export function appendSessionLog(vault, summary) {
  const trimmed = summary?.trim();
  if (!trimmed) return null;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const rel = `Memory/Daily/${date}.md`;
  const path = join(vault, rel);
  mkdirSync(dirname(path), { recursive: true });
  const time = now.toISOString().slice(11, 16);
  const line = `- ${time} (session) ${trimmed}`;

  if (!existsSync(path)) {
    writeFileSync(
      path,
      `---
date: ${date}
---

# ${date}

## Log

${line}
`,
      'utf8'
    );
    return rel;
  }

  const existing = readFileSync(path, 'utf8');
  const updated = existing.includes('## Log\n')
    ? existing.replace('## Log\n', `## Log\n\n${line}\n`)
    : `${existing.trim()}\n\n## Log\n\n${line}\n`;
  writeFileSync(path, updated, 'utf8');
  return rel;
}

export function parseVaultFile(absPath) {
  const raw = readFileSync(absPath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) frontmatter[kv[1]] = kv[2].trim();
    const listStart = line.match(/^(\w+):\s*$/);
    if (listStart) frontmatter[listStart[1]] = [];
  }

  const entities = [];
  let inEntities = false;
  for (const line of match[1].split('\n')) {
    if (line.match(/^entities:\s*$/)) {
      inEntities = true;
      continue;
    }
    if (inEntities) {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item) {
        entities.push(item[1].trim());
        continue;
      }
      inEntities = false;
    }
  }
  if (entities.length) frontmatter.entities = entities;

  const body = match[2].trim();
  if (!frontmatter.id || !body) return null;

  return {
    id: frontmatter.id,
    type: frontmatter.type === 'episodic' ? 'episodic' : 'semantic',
    importance: frontmatter.importance || 'medium',
    created_at: frontmatter.created_at || new Date().toISOString(),
    entities,
    content: body,
  };
}
