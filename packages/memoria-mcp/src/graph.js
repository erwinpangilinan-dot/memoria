export function buildGraph(db) {
  const entities = db.prepare('SELECT id, name, created_at FROM entities ORDER BY name').all();
  const memories = db
    .prepare('SELECT id, type, content, vault_path, created_at FROM memories ORDER BY created_at DESC')
    .all();
  const links = db
    .prepare(
      `SELECT me.memory_id, me.entity_id, e.name AS entity_name
       FROM memory_entities me
       JOIN entities e ON e.id = me.entity_id`
    )
    .all();

  const nodes = [
    ...entities.map((e) => ({ id: e.id, kind: 'entity', label: e.name, created_at: e.created_at })),
    ...memories.map((m) => ({
      id: m.id,
      kind: 'memory',
      label: m.content.slice(0, 80),
      type: m.type,
      vault_path: m.vault_path,
      created_at: m.created_at,
    })),
  ];

  const edges = links.map((l) => ({
    from: l.entity_id,
    to: l.memory_id,
    kind: 'linked',
    label: l.entity_name,
  }));

  const cooccurrence = new Map();
  for (const memoryId of new Set(links.map((l) => l.memory_id))) {
    const names = links.filter((l) => l.memory_id === memoryId).map((l) => l.entity_id);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join('|');
        cooccurrence.set(key, (cooccurrence.get(key) || 0) + 1);
      }
    }
  }
  for (const [key, weight] of cooccurrence) {
    const [a, b] = key.split('|');
    edges.push({ from: a, to: b, kind: 'cooccurrence', weight });
  }

  return {
    node_count: nodes.length,
    edge_count: edges.length,
    nodes,
    edges,
  };
}
