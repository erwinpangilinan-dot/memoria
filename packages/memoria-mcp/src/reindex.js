import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { extractEntities } from './entities.js';
import { isIgnored, loadIgnorePatterns } from './ignore.js';
import { parseVaultFile } from './vault.js';

function walkMarkdown(dir, root, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (name === '.memoria' || name === '.brain') continue;
      walkMarkdown(abs, root, out);
      continue;
    }
    if (name.endsWith('.md')) out.push(relative(root, abs).replace(/\\/g, '/'));
  }
  return out;
}

export function reindexVault(store) {
  const vault = store.vaultPath;
  const patterns = loadIgnorePatterns(vault);
  const files = walkMarkdown(vault, vault).filter((rel) => !isIgnored(rel, patterns));

  const seen = new Set();
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const rel of files) {
    const parsed = parseVaultFile(join(vault, rel));
    if (!parsed) {
      skipped++;
      continue;
    }
    seen.add(parsed.id);

    const row = store.db.prepare('SELECT id, content, vault_path FROM memories WHERE id = ?').get(parsed.id);
    if (!row) {
      store.db
        .prepare(
          `INSERT INTO memories (id, type, content, importance, vault_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(parsed.id, parsed.type, parsed.content, parsed.importance, rel, parsed.created_at);
      const names = parsed.entities.length ? parsed.entities : extractEntities(parsed.content);
      store.linkEntities(parsed.id, names, parsed.created_at);
      added++;
      continue;
    }

    if (row.content !== parsed.content || row.vault_path !== rel) {
      store.db
        .prepare(
          `UPDATE memories SET type = ?, content = ?, importance = ?, vault_path = ?, created_at = ?
           WHERE id = ?`
        )
        .run(parsed.type, parsed.content, parsed.importance, rel, parsed.created_at, parsed.id);
      const names = parsed.entities.length ? parsed.entities : extractEntities(parsed.content);
      store.linkEntities(parsed.id, names, parsed.created_at);
      updated++;
    }
  }

  return { scanned: files.length, added, updated, skipped, indexed_ids: seen.size, ignored_patterns: patterns.length };
}
