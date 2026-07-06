import * as sqliteVec from 'sqlite-vec';
import { EMBED_DIM, embeddingsEnabled } from './config.js';
import { vectorToBlob } from './embed.js';

let extensionLoaded = false;

export function initVectorExtension(db) {
  if (!embeddingsEnabled() || extensionLoaded) return embeddingsEnabled();
  sqliteVec.load(db);
  extensionLoaded = true;
  return true;
}

export function ensureVectorSchema(db) {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
      embedding float[${EMBED_DIM}]
    );

    CREATE TRIGGER IF NOT EXISTS memories_ad_vec AFTER DELETE ON memories BEGIN
      DELETE FROM memory_embeddings WHERE rowid = old.rowid;
    END;
  `);
}

export function upsertEmbedding(db, rowid, vector) {
  if (!vector) return;
  db.prepare('DELETE FROM memory_embeddings WHERE rowid = ?').run(rowid);
  db.prepare('INSERT INTO memory_embeddings(rowid, embedding) VALUES (?, ?)').run(
    BigInt(rowid),
    vectorToBlob(vector)
  );
}

export function searchEmbeddings(db, queryVector, limit, memoryType = null) {
  let sql = `
    SELECT m.id, m.type, m.content, m.importance, m.vault_path, m.created_at,
           vec.distance AS vector_distance
    FROM memory_embeddings vec
    JOIN memories m ON m.rowid = vec.rowid
    WHERE vec.embedding MATCH ? AND k = ?
  `;
  const params = [vectorToBlob(queryVector), limit];
  if (memoryType) {
    sql += ' AND m.type = ?';
    params.push(memoryType);
  }
  sql += ' ORDER BY vec.distance';
  try {
    return db.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

export function embeddingCount(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM memory_embeddings').get().n;
  } catch {
    return 0;
  }
}

export function hasEmbedding(db, memoryId) {
  try {
    const row = db.prepare('SELECT rowid FROM memories WHERE id = ?').get(memoryId);
    if (!row) return false;
    return !!db.prepare('SELECT 1 AS ok FROM memory_embeddings WHERE rowid = ?').get(row.rowid);
  } catch {
    return false;
  }
}
