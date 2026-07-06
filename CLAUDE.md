# Memoria

Human-like selective memory for this project. Agents use the **memoria** MCP server; humans browse `vault/`.

## Agent workflows

1. **Before non-trivial work** — `memoria_recall` with a query from the request. Use `memoria_entity` for named people/topics.
2. **When the user shares durable facts** — `memoria_remember` with `[[Entity]]` wikilinks. Use `importance: high` when they say "remember this".
3. **Do not store** small talk or transient debug output.

Skill details: `.cursor/skills/memoria/SKILL.md`

## MCP setup

- **Claude Code:** `.mcp.json` at repo root (project scope). Restart session after changes.
- **Install:** `npm install --prefix packages/memoria-mcp`
- **Verify:** `npm run check --prefix packages/memoria-mcp`

## Vault

Markdown notes live in `vault/` (`Facts/`, `Episodes/`, `People/`, `Projects/`, `Memory/Daily/`). SQLite index at `vault/.memoria/index.db`. After editing vault files by hand, run `memoria_reindex`.

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
