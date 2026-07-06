import { writeMemoryFile } from './vault.js';

export function consolidate(store, { dry_run = true, min_age_days = 7 } = {}) {
  const actions = [];

  const dupes = store.db
    .prepare(
      `SELECT content, GROUP_CONCAT(id) AS ids, COUNT(*) AS n
       FROM memories GROUP BY content HAVING n > 1`
    )
    .all();
  for (const row of dupes) {
    const ids = row.ids.split(',');
    actions.push({
      action: 'dedupe',
      keep: ids[0],
      remove: ids.slice(1),
      content: row.content.slice(0, 120),
    });
  }

  const aged = store.db
    .prepare(
      `SELECT id, content, importance, vault_path, created_at
       FROM memories
       WHERE type = 'episodic'
         AND importance IN ('high', 'medium')
         AND datetime(created_at) < datetime('now', '-' || ? || ' days')`
    )
    .all(min_age_days);

  for (const row of aged) {
    const semanticDup = store.db
      .prepare(`SELECT id FROM memories WHERE type = 'semantic' AND content = ? LIMIT 1`)
      .get(row.content);
    if (semanticDup) {
      actions.push({
        action: 'skip_promote',
        memory_id: row.id,
        reason: 'semantic_duplicate_exists',
      });
      continue;
    }
    actions.push({
      action: 'promote',
      memory_id: row.id,
      from: row.vault_path,
      content: row.content.slice(0, 120),
    });
  }

  if (dry_run) {
    return { dry_run: true, actions, applied: 0 };
  }

  let applied = 0;
  for (const act of actions) {
    if (act.action === 'dedupe') {
      for (const id of act.remove) {
        store.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
        applied++;
      }
      continue;
    }
    if (act.action !== 'promote') continue;

    const row = store.db
      .prepare('SELECT id, content, importance, created_at FROM memories WHERE id = ?')
      .get(act.memory_id);
    if (!row) continue;

    const entities = store.db
      .prepare(
        `SELECT e.name FROM entities e
         JOIN memory_entities me ON me.entity_id = e.id
         WHERE me.memory_id = ?`
      )
      .all(row.id)
      .map((r) => r.name);

    const vaultRel = writeMemoryFile(
      store.vaultPath,
      'semantic',
      row.content,
      row.importance,
      row.id,
      entities
    );
    store.db
      .prepare(`UPDATE memories SET type = 'semantic', vault_path = ? WHERE id = ?`)
      .run(vaultRel, row.id);
    applied++;
  }

  return { dry_run: false, actions, applied };
}
