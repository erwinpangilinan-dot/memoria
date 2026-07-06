# Second Brain / Memoria

Human-like selective memory for AI agents: **Memoria** (local markdown vault you browse and edit) + SQLite index, exposed to agents via MCP.

**Repository:** https://github.com/erwinpangilinan-dot/memoria

## Terminology

| Term | What it is |
|------|------------|
| **Memoria** | Your human-facing second brain — markdown notes, wikilinks, daily log, graph |
| **memoria MCP** | Agent interface — `memoria_remember`, `memoria_recall`, `memoria_status` |
| **`vault/`** | Memoria storage on disk |

## Quick start

```bash
npm install --prefix packages/memoria-mcp
npm run check --prefix packages/memoria-mcp
```

## Agent setup (Cursor + Claude Code)

### Cursor

Copy the example and install deps:

```bash
cp .cursor/mcp.json.example .cursor/mcp.json   # or merge memoria entry
npm install --prefix packages/memoria-mcp
```

Restart Cursor after editing `.cursor/mcp.json`.

### Claude Code

`.mcp.json` at the repo root registers the `memoria` MCP server (project scope, team-shared). Install deps, start a new session, and approve the server when prompted.

```bash
npm install --prefix packages/memoria-mcp
```

Project instructions for Claude Code: `CLAUDE.md`. Agent skill: `.cursor/skills/memoria/SKILL.md`.

### Verify Phase 3

```bash
node scripts/check-phase3.js
npm run check --prefix packages/memoria-mcp
```

## Tools

| Tool | Purpose |
|------|---------|
| `memoria_remember` | Store with salience gate (+ markdown file) |
| `memoria_recall` | Multi-signal search (FTS + entities + recency) |
| `memoria_entity` | Lookup entity and linked memories |
| `memoria_status` | Counts, entities, vault/db paths |

## Memoria layout (`vault/`)

```
vault/
├── Episodes/     # time-bound (keys location, today's events)
├── Facts/        # durable facts (birthdays, preferences)
├── People/
├── Projects/
└── Memory/Daily/
```

## Environment

| Variable | Default |
|----------|---------|
| `MEMORIA_VAULT_PATH` | `<repo>/vault` |
| `MEMORIA_DB_PATH` | `<vault>/.memoria/index.db` |

(`BRAIN_*` env vars still work as aliases.)

## Roadmap

- [x] Phase 1: MCP skeleton (remember / recall / status)
- [x] Phase 2: Salience gate, entities, multi-signal recall
- [x] Phase 3: memoria skill + Claude Code config
- [ ] Phase 4: Memoria UX (wikilinks, daily notes, `.memoriaignore`, conversation hooks) + consolidation job

Track progress: [Mission Control — Memory Project](http://10.10.50.6/)
