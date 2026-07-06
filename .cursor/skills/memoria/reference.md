# Memoria MCP Reference

## Setup

### Cursor

1. Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` (or merge the `memoria` entry).
2. `npm install --prefix packages/memoria-mcp`
3. Restart Cursor.

### Claude Code

1. `.mcp.json` at repo root is already configured (project scope).
2. `npm install --prefix packages/memoria-mcp`
3. Start a new session; approve the `memoria` server when prompted.

MCP entry: `packages/memoria-mcp/run.sh` (sets vault/db paths from repo root).

## Environment

| Variable | Default |
|----------|---------|
| `MEMORIA_VAULT_PATH` | `<repo>/vault` |
| `MEMORIA_DB_PATH` | `<vault>/.memoria/index.db` |

`BRAIN_VAULT_PATH` and `BRAIN_DB_PATH` work as aliases.

## MCP Tools

### memoria_remember

Store a memory after salience gating.

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `content` | string | required | Use `[[Entity]]` wikilinks for durable facts |
| `memory_type` | `episodic` \| `semantic` | `semantic` | Episodic → `Episodes/YYYY-MM-DD-*.md` |
| `importance` | `low` \| `medium` \| `high` | `medium` | `high` bypasses gate |
| `force` | boolean | `false` | Bypass salience gate |

**Stored response:** `{ stored: true, id, type, importance, salience_score, entities, vault_path, created_at }`

**Rejected:** `{ stored: false, reason: "below_threshold", salience_score, hint }`

**Duplicate:** `{ stored: false, duplicate: true, existing: { ... } }`

### memoria_recall

Multi-signal search: FTS (45%) + entity match (30%) + recency (15%) + importance (10%).

| Param | Type | Default |
|-------|------|---------|
| `query` | string | required |
| `limit` | int 1–20 | `8` |
| `memory_type` | `episodic` \| `semantic` | all types |

Returns array of `{ id, type, content, importance, vault_path, created_at, score }`.

### memoria_entity

Lookup entity and linked memories (up to 20, newest first).

| Param | Type |
|-------|------|
| `name` | string (normalized to lowercase) |

Returns `{ entity: { id, name, created_at } \| null, memories: [...] }`.

### memoria_status

No parameters. Returns:

```json
{
  "version": "0.3.0",
  "total_memories": 0,
  "total_entities": 0,
  "by_type": { "semantic": 0, "episodic": 0 },
  "last_created_at": null,
  "vault_path": "...",
  "db_path": "..."
}
```

### memoria_graph

No parameters. Returns `{ node_count, edge_count, nodes[], edges[] }`.

- **nodes:** `entity` or `memory` kind, with `label`, optional `vault_path`
- **edges:** `linked` (entity→memory) or `cooccurrence` (entity↔entity in same memory)

### memoria_daily

| Param | Type | Default |
|-------|------|---------|
| `date` | `YYYY-MM-DD` | today |

Returns `{ date, path, content }` — `content` is `null` if the note does not exist.

### memoria_reindex

No parameters. Scans `vault/**/*.md` (skips `.memoria/`, respects `.memoriaignore`), upserts into SQLite.

Returns `{ scanned, added, updated, skipped, indexed_ids, ignored_patterns }`.

### memoria_consolidate

| Param | Type | Default |
|-------|------|---------|
| `dry_run` | boolean | `true` |
| `min_age_days` | int 1–365 | `7` |

Finds duplicate content and aged episodic memories to promote to semantic. Set `dry_run: false` to apply.

## Salience gate (threshold 0.45)

Bypassed when `force: true` or `importance: high`.

| Signal | Score boost |
|--------|-------------|
| `importance: medium` | +0.25 |
| `importance: low` | +0.05 |
| ≥ 6 words | +0.15 |
| Has `[[entity]]` wikilinks | +0.25 |
| `memory_type: semantic` | +0.10 |
| Salience keywords | +0.35 |

Keywords: `birthday`, `anniversary`, `allergic`, `allergy`, `prefers`, `favorite`, `favourite`, `never forget`, `important`, `deadline`.

## Vault layout

```
vault/
├── Episodes/     # time-bound
├── Facts/        # durable
├── People/
├── Projects/
└── Memory/Daily/
```

Each stored memory writes a markdown file with YAML frontmatter (`id`, `type`, `importance`, `created_at`, `entities`).

Episodic memories also append to `Memory/Daily/YYYY-MM-DD.md`. Entities get stub pages in `People/` or `Projects/` with backlinks.

### .memoriaignore

Copy `vault/.memoriaignore.example` → `vault/.memoriaignore`. One glob/prefix per line; used by `memoria_reindex`.

### Conversation hooks

`.cursor/hooks.json` registers `sessionEnd` → `.cursor/hooks/memoria-session-log.sh`, which appends a line to today's daily note.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP tools missing | Restart IDE; verify `.mcp.json` / `.cursor/mcp.json` |
| `below_threshold` on valid fact | Add `[[Entity]]`, salience keyword, or `importance: high` |
| Empty recall | Run `memoria_status`; check `total_memories` |
| Wrong vault | Set `MEMORIA_VAULT_PATH` before starting MCP |
