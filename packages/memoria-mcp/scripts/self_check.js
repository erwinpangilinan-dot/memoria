import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../src/store.js';

const tmp = mkdtempSync(join(tmpdir(), 'memoria-check-'));
const vault = join(tmp, 'vault');
const db = join(vault, '.memoria', 'index.db');

try {
  const store = new MemoryStore(db, vault);

  const rejected = store.remember('ok', 'episodic', 'low');
  if (rejected.stored !== false) throw new Error(`gate should reject: ${JSON.stringify(rejected)}`);

  store.remember('[[Sarah]] birthday is March 12', 'semantic', 'high');
  store.remember('Keys on [[kitchen counter]]', 'episodic', 'medium', true);

  const hits = store.recall('Sarah birthday');
  if (!hits.some((h) => h.content.includes('March 12'))) {
    throw new Error(`recall failed: ${JSON.stringify(hits)}`);
  }

  const entity = store.entity('sarah');
  if (!entity.memories.length) throw new Error(JSON.stringify(entity));

  const hits2 = store.recall('keys kitchen');
  if (!hits2.some((h) => h.content.includes('kitchen counter'))) {
    throw new Error(`recall2 failed: ${JSON.stringify(hits2)}`);
  }

  const st = store.status();
  if (st.total_memories !== 2) throw new Error(JSON.stringify(st));
  if (st.total_entities < 2) throw new Error(JSON.stringify(st));

  console.log('self_check: ok');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
