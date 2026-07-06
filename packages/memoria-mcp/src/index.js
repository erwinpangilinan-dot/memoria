#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { dbPath, vaultPath } from './config.js';
import { MemoryStore } from './store.js';

const store = new MemoryStore(dbPath(), vaultPath());

const server = new McpServer({
  name: 'memoria',
  version: '0.1.0',
});

function jsonResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

server.tool(
  'memoria_remember',
  'Store a memory in Memoria (SQLite index + markdown file in vault/).',
  {
    content: z.string().min(1),
    memory_type: z.enum(['episodic', 'semantic']).optional(),
    importance: z.enum(['low', 'medium', 'high']).optional(),
  },
  async ({ content, memory_type = 'semantic', importance = 'medium' }) =>
    jsonResult(store.remember(content, memory_type, importance))
);

server.tool(
  'memoria_recall',
  'Recall memories by FTS search. Returns top matches only, not the full database.',
  {
    query: z.string().min(1),
    limit: z.number().int().min(1).max(20).optional(),
    memory_type: z.enum(['episodic', 'semantic']).optional(),
  },
  async ({ query, limit = 8, memory_type }) =>
    jsonResult(store.recall(query, limit, memory_type ?? null))
);

server.tool(
  'memoria_status',
  'Index health: memory counts, Memoria vault path, database path.',
  {},
  async () => jsonResult(store.status())
);

const transport = new StdioServerTransport();
await server.connect(transport);
