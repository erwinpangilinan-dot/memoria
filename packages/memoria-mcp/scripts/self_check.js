import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../src/store.js';

process.env.MEMORIA_EMBEDDINGS = 'mock';

const tmp = mkdtempSync(join(tmpdir(), 'memoria-check-'));
const vault = join(tmp, 'vault');
const db = join(vault, '.memoria', 'index.db');

try {
  const store = new MemoryStore(db, vault);

  const rejected = await store.remember('ok', 'episodic', 'low');
  if (rejected.stored !== false) throw new Error(`gate should reject: ${JSON.stringify(rejected)}`);

  const sem = await store.remember('[[Sarah]] birthday is March 12', 'semantic', 'high');
  const epi = await store.remember('Keys on [[kitchen counter]]', 'episodic', 'medium', true);
  if (!sem.entity_pages?.length) throw new Error(`entity pages: ${JSON.stringify(sem)}`);
  if (!epi.daily_path) throw new Error(`daily note: ${JSON.stringify(epi)}`);

  const hits = await store.recall('Sarah birthday');
  if (!hits.some((h) => h.content.includes('March 12'))) {
    throw new Error(`recall failed: ${JSON.stringify(hits)}`);
  }

  const entity = store.entity('sarah');
  if (!entity.memories.length) throw new Error(JSON.stringify(entity));

  const graph = store.graph();
  if (graph.node_count < 3 || graph.edge_count < 1) throw new Error(JSON.stringify(graph));

  const daily = store.daily();
  if (!daily.content?.includes('kitchen counter')) throw new Error(JSON.stringify(daily));

  const reindex = await store.reindex();
  if (reindex.scanned < 2) throw new Error(JSON.stringify(reindex));

  const consolidation = store.runConsolidate({ dry_run: true });
  if (!Array.isArray(consolidation.actions)) throw new Error(JSON.stringify(consolidation));

  const st = store.status();
  if (st.total_memories !== 2) throw new Error(JSON.stringify(st));
  if (st.total_entities < 2) throw new Error(JSON.stringify(st));
  if (st.version !== '0.5.0') throw new Error(JSON.stringify(st));
  if (!st.embeddings.enabled || st.embeddings.indexed !== 2) {
    throw new Error(`embeddings: ${JSON.stringify(st.embeddings)}`);
  }

  const peoplePage = join(vault, 'People', 'sarah.md');
  if (!existsSync(peoplePage)) throw new Error('missing People/sarah.md');

  console.log('self_check: ok');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
