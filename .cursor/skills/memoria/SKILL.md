---
name: memoria
description: >-
  Store and recall personal knowledge via the memoria MCP server.
  Use when starting work that needs prior context, when the user shares
  preferences or facts, when they say remember this, or when answering
  questions about people, projects, or past notes in Memoria.
---

# Memoria

Use the **memoria** MCP server for durable local memory stored in **Memoria** (`vault/`).

## Before non-trivial work

1. `memoria_recall` with a query from the user's request.
2. Use `memoria_entity` when the query is about a specific person or topic.
3. Use matches as context; mention Memoria paths (e.g. `Facts/...`) when helpful.

## When to remember

| Situation | Action |
|-----------|--------|
| User says "remember this" | `memoria_remember` with `importance: high` |
| Durable fact (person, pref, decision) | `memory_type: semantic`, use `[[Entity]]` wikilinks |
| Time-bound (where X is, today's note) | `memory_type: episodic` |
| Small talk, transient debug | Do **not** store |

If `memoria_remember` returns `stored: false` with `below_threshold`, only retry with `force: true` when the user explicitly wants it kept.

## Tools

| Tool | Use |
|------|-----|
| `memoria_recall` | Multi-signal search (text + entities + recency) |
| `memoria_remember` | Store with salience gate |
| `memoria_entity` | All memories linked to a person/topic |
| `memoria_status` | Index health |

## After storing

Confirm id, entities, and Memoria path briefly.

## Do not

- Rely on chat history alone — verify with `memoria_recall`.
- Store secrets unless the user explicitly asks.
