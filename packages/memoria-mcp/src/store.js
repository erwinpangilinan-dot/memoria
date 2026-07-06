import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { writeMemoryFile } from './vault.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('episodic', 'semantic')),
  content TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'medium',
  vault_path TEXT,
  created_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content,
  content='memories',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content)
  VALUES ('delete', old.rowid, old.content);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content)
  VALUES ('delete', old.rowid, old.content);
  INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
END;
`;

export class MemoryStore {
  constructor(dbFile, vault) {
    this.vaultPath = vault;
    mkdirSync(dirname(dbFile), { recursive: true });
    this.db = new DatabaseSync(dbFile);
    this.db.exec(SCHEMA);
  }

  remember(content, memoryType = 'semantic', importance = 'medium') {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const vaultRel = writeMemoryFile(
      this.vaultPath,
      memoryType,
      content,
      importance,
      id
    );

    this.db
      .prepare(
        `INSERT INTO memories (id, type, content, importance, vault_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, memoryType, content.trim(), importance, vaultRel, createdAt);

    return {
      id,
      type: memoryType,
      importance,
      vault_path: vaultRel,
      created_at: createdAt,
    };
  }

  recall(query, limit = 8, memoryType = null) {
    const ftsQuery = ftsQueryFromText(query);
    let sql = `
      SELECT m.id, m.type, m.content, m.importance, m.vault_path, m.created_at,
             bm25(memories_fts) AS score
      FROM memories_fts
      JOIN memories m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
    `;
    const params = [ftsQuery];
    if (memoryType) {
      sql += ' AND m.type = ?';
      params.push(memoryType);
    }
    sql += ' ORDER BY score LIMIT ?';
    params.push(limit);

    let rows = this.db.prepare(sql).all(...params);
    if (rows.length > 0) return rows;

    // ponytail: LIKE fallback when FTS returns nothing
    let fallback = `
      SELECT id, type, content, importance, vault_path, created_at, 0 AS score
      FROM memories WHERE content LIKE ?
    `;
    const fbParams = [`%${query.trim()}%`];
    if (memoryType) {
      fallback += ' AND type = ?';
      fbParams.push(memoryType);
    }
    fallback += ' ORDER BY created_at DESC LIMIT ?';
    fbParams.push(limit);
    return this.db.prepare(fallback).all(...fbParams);
  }

  status() {
    const total = this.db.prepare('SELECT COUNT(*) AS n FROM memories').get().n;
    const byTypeRows = this.db
      .prepare('SELECT type, COUNT(*) AS n FROM memories GROUP BY type')
      .all();
    const byType = Object.fromEntries(byTypeRows.map((r) => [r.type, r.n]));
    const last = this.db
      .prepare('SELECT created_at FROM memories ORDER BY created_at DESC LIMIT 1')
      .get();
    return {
      total_memories: total,
      by_type: byType,
      last_created_at: last?.created_at ?? null,
      vault_path: this.vaultPath,
      db_path: this.db.filename ?? null,
    };
  }
}

function ftsQueryFromText(text) {
  const tokens = text.toLowerCase().match(/\w+/g) || [];
  if (tokens.length === 0) return '""';
  return tokens
    .slice(0, 12)
    .map((t) => `"${t}"`)
    .join(' OR ');
}
