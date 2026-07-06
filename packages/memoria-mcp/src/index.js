#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { dbPath, vaultPath } from './config.js';
import { MemoryStore } from './store.js';

const store = new MemoryStore(dbPath(), vaultPath());

const server = new McpServer({
  name: 'memoria',
  version: '0.2.0',
});

function jsonResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

server.tool(
  'memoria_remember',
  'Store a memory in Memoria after salience gating (SQLite + markdown). Rejects low-value noise unless force or high importance.',
  {
    content: z.string().min(1),
    memory_type: z.enum(['episodic', 'semantic']).optional(),
    importance: z.enum(['low', 'medium', 'high']).optional(),
    force: z.boolean().optional().describe('Bypass salience gate'),
  },
  async ({ content, memory_type = 'semantic', importance = 'medium', force = false }) =>
    jsonResult(store.remember(content, memory_type, importance, force))
);

server.tool(
  'memoria_recall',
  'Multi-signal recall: FTS + entity links + recency + importance. Returns top matches only.',
  {
    query: z.string().min(1),
    limit: z.number().int().min(1).max(20).optional(),
    memory_type: z.enum(['episodic', 'semantic']).optional(),
  },
  async ({ query, limit = 8, memory_type }) =>
    jsonResult(store.recall(query, limit, memory_type ?? null))
);

server.tool(
  'memoria_entity',
  'Look up an entity (person, place, topic) and memories linked to it.',
  {
    name: z.string().min(1),
  },
  async ({ name }) => jsonResult(store.entity(name))
);

server.tool(
  'memoria_status',
  'Index health: memory counts, entity counts, vault and database paths.',
  {},
  async () => jsonResult(store.status())
);

const transport = new StdioServerTransport();
await server.connect(transport);
