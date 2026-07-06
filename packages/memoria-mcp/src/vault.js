import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function slugify(text, maxLen = 48) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return (slug.slice(0, maxLen).replace(/-$/, '') || 'memory');
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
