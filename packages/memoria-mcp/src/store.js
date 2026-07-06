import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { extractEntities, normalizeEntity } from './entities.js';
import { evaluateSalience } from './gate.js';
import { appendDailyNote, ensureEntityPage, writeMemoryFile } from './vault.js';
import { buildGraph } from './graph.js';
import { consolidate } from './consolidate.js';
import { reindexVault } from './reindex.js';

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

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_entities (
  memory_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (memory_id, entity_id),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
`;

const IMPORTANCE_WEIGHT = { high: 1, medium: 0.55, low: 0.25 };

export class MemoryStore {
  constructor(dbFile, vault) {
    this.vaultPath = vault;
    mkdirSync(dirname(dbFile), { recursive: true });
    this.db = new DatabaseSync(dbFile);
    this.db.exec(SCHEMA);
    this.backfillEntities();
  }

  backfillEntities() {
    const linked = this.db.prepare('SELECT COUNT(*) AS n FROM memory_entities').get().n;
    if (linked > 0) return;
    const rows = this.db.prepare('SELECT id, content, created_at FROM memories').all();
    for (const row of rows) {
      this.linkEntities(row.id, extractEntities(row.content), row.created_at);
    }
  }

  remember(content, memoryType = 'semantic', importance = 'medium', force = false) {
    const trimmed = content.trim();
    const gate = evaluateSalience(trimmed, { importance, memoryType, force });
    if (!gate.store) {
      return {
        stored: false,
        reason: gate.reason,
        salience_score: gate.score,
        hint: 'Use force:true or importance:high to store anyway.',
      };
    }

    const dup = this.recall(trimmed.split(/\s+/).slice(0, 8).join(' '), 1, memoryType);
    if (dup.length && dup[0].content.trim() === trimmed) {
      return { stored: false, duplicate: true, existing: this.formatRow(dup[0]) };
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const vaultRel = writeMemoryFile(
      this.vaultPath,
      memoryType,
      trimmed,
      importance,
      id,
      gate.entities
    );

    this.db
      .prepare(
        `INSERT INTO memories (id, type, content, importance, vault_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, memoryType, trimmed, importance, vaultRel, createdAt);

    this.linkEntities(id, gate.entities, createdAt);

    const daily_path =
      memoryType === 'episodic' ? appendDailyNote(this.vaultPath, memoryType, trimmed, vaultRel) : null;
    const entity_pages = gate.entities.map((name) =>
      ensureEntityPage(this.vaultPath, name, vaultRel)
    );

    return {
      stored: true,
      id,
      type: memoryType,
      importance,
      salience_score: gate.score,
      entities: gate.entities,
      vault_path: vaultRel,
      daily_path,
      entity_pages,
      created_at: createdAt,
    };
  }

  linkEntities(memoryId, names, createdAt) {
    const findEntity = this.db.prepare(`SELECT id FROM entities WHERE name = ?`);
    const insertEntity = this.db.prepare(
      `INSERT INTO entities (id, name, created_at) VALUES (?, ?, ?)`
    );
    const link = this.db.prepare(
      `INSERT OR IGNORE INTO memory_entities (memory_id, entity_id) VALUES (?, ?)`
    );

    for (const name of names) {
      const normalized = normalizeEntity(name);
      if (!normalized) continue;
      let row = findEntity.get(normalized);
      if (!row) {
        const entityId = randomUUID();
        insertEntity.run(entityId, normalized, createdAt);
        row = { id: entityId };
      }
      link.run(memoryId, row.id);
    }
  }

  recall(query, limit = 8, memoryType = null) {
    const tokens = tokenize(query);
    const pool = new Map();

    for (const row of this.ftsCandidates(query, memoryType, limit * 4)) {
      pool.set(row.id, row);
    }
    for (const row of this.entityCandidates(tokens, memoryType, limit * 3)) {
      pool.set(row.id, { ...row, entity_match: true });
    }
    if (pool.size === 0) {
      for (const row of this.likeCandidates(query, memoryType, limit)) {
        pool.set(row.id, row);
      }
    }

    const ranked = [...pool.values()]
      .map((row) => this.scoreRow(row, tokens))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map((r) => this.formatRow(r));
  }

  entity(name) {
    const normalized = normalizeEntity(name);
    const entityRow = this.db
      .prepare(`SELECT id, name, created_at FROM entities WHERE name = ?`)
      .get(normalized);
    if (!entityRow) return { entity: null, memories: [] };

    const memories = this.db
      .prepare(
        `SELECT m.id, m.type, m.content, m.importance, m.vault_path, m.created_at
         FROM memories m
         JOIN memory_entities me ON me.memory_id = m.id
         WHERE me.entity_id = ?
         ORDER BY m.created_at DESC
         LIMIT 20`
      )
      .all(entityRow.id)
      .map((r) => this.formatRow(r));

    return { entity: entityRow, memories };
  }

  ftsCandidates(query, memoryType, cap) {
    const ftsQuery = ftsQueryFromText(query);
    let sql = `
      SELECT m.id, m.type, m.content, m.importance, m.vault_path, m.created_at,
             bm25(memories_fts) AS fts_raw
      FROM memories_fts
      JOIN memories m ON m.rowid = memories_fts.rowid
      WHERE memories_fts MATCH ?
    `;
    const params = [ftsQuery];
    if (memoryType) {
      sql += ' AND m.type = ?';
      params.push(memoryType);
    }
    sql += ' ORDER BY fts_raw LIMIT ?';
    params.push(cap);
    try {
      return this.db.prepare(sql).all(...params);
    } catch {
      return [];
    }
  }

  entityCandidates(tokens, memoryType, cap) {
    if (tokens.length === 0) return [];
    const placeholders = tokens.map(() => '?').join(', ');
    let sql = `
      SELECT DISTINCT m.id, m.type, m.content, m.importance, m.vault_path, m.created_at,
             0 AS fts_raw
      FROM memories m
      JOIN memory_entities me ON me.memory_id = m.id
      JOIN entities e ON e.id = me.entity_id
      WHERE e.name IN (${placeholders})
    `;
    const params = [...tokens];
    if (memoryType) {
      sql += ' AND m.type = ?';
      params.push(memoryType);
    }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(cap);
    return this.db.prepare(sql).all(...params);
  }

  likeCandidates(query, memoryType, cap) {
    let sql = `
      SELECT id, type, content, importance, vault_path, created_at, 0 AS fts_raw
      FROM memories WHERE content LIKE ?
    `;
    const params = [`%${query.trim()}%`];
    if (memoryType) {
      sql += ' AND type = ?';
      params.push(memoryType);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(cap);
    return this.db.prepare(sql).all(...params);
  }

  scoreRow(row, queryTokens) {
    const ftsNorm = row.fts_raw != null ? 1 / (1 + Math.abs(row.fts_raw)) : 0.15;
    const importance = IMPORTANCE_WEIGHT[row.importance] ?? 0.5;
    const recency = recencyBoost(row.created_at);
    const entityBoost = this.entityBoost(row.id, queryTokens);
    const score =
      ftsNorm * 0.45 + entityBoost * 0.3 + recency * 0.15 + importance * 0.1;
    return { ...row, score: Math.round(score * 10000) / 10000 };
  }

  entityBoost(memoryId, queryTokens) {
    if (queryTokens.length === 0) return 0;
    const rows = this.db
      .prepare(
        `SELECT e.name FROM entities e
         JOIN memory_entities me ON me.entity_id = e.id
         WHERE me.memory_id = ?`
      )
      .all(memoryId);
    if (rows.length === 0) return 0;
    const names = new Set(rows.map((r) => r.name));
    const hits = queryTokens.filter((t) => names.has(t)).length;
    return Math.min(1, hits / queryTokens.length);
  }

  formatRow(row) {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      importance: row.importance,
      vault_path: row.vault_path,
      created_at: row.created_at,
      score: row.score ?? null,
    };
  }

  graph() {
    return buildGraph(this.db);
  }

  reindex() {
    return reindexVault(this);
  }

  runConsolidate(options = {}) {
    return consolidate(this, options);
  }

  daily(date = null) {
    const d = date || new Date().toISOString().slice(0, 10);
    const rel = `Memory/Daily/${d}.md`;
    const abs = join(this.vaultPath, rel);
    if (!existsSync(abs)) return { date: d, path: rel, content: null };
    return { date: d, path: rel, content: readFileSync(abs, 'utf8') };
  }

  status() {
    const total = this.db.prepare('SELECT COUNT(*) AS n FROM memories').get().n;
    const entities = this.db.prepare('SELECT COUNT(*) AS n FROM entities').get().n;
    const byTypeRows = this.db
      .prepare('SELECT type, COUNT(*) AS n FROM memories GROUP BY type')
      .all();
    const byType = Object.fromEntries(byTypeRows.map((r) => [r.type, r.n]));
    const last = this.db
      .prepare('SELECT created_at FROM memories ORDER BY created_at DESC LIMIT 1')
      .get();
    return {
      version: '0.3.0',
      total_memories: total,
      total_entities: entities,
      by_type: byType,
      last_created_at: last?.created_at ?? null,
      vault_path: this.vaultPath,
      db_path: this.db.filename ?? null,
    };
  }
}

function tokenize(text) {
  return [...new Set((text.toLowerCase().match(/\w+/g) || []).slice(0, 12))];
}

function recencyBoost(iso) {
  const ageDays = (Date.now() - new Date(iso).getTime()) / 86400000;
  return Math.exp(-ageDays / 30);
}

function ftsQueryFromText(text) {
  const tokens = text.toLowerCase().match(/\w+/g) || [];
  if (tokens.length === 0) return '""';
  return tokens
    .slice(0, 12)
    .map((t) => `"${t}"`)
    .join(' OR ');
}
