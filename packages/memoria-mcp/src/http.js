#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createMemoriaServer } from './create-server.js';
import { dbPath, httpHost, httpPort, httpToken, vaultPath } from './config.js';
import { MemoryStore } from './store.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const VERSION = '0.4.0';
const store = new MemoryStore(dbPath(), vaultPath());
const mcp = createMemoriaServer(store, VERSION);
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

await mcp.connect(transport);

function authorized(req) {
  const token = httpToken();
  if (!token) return true;
  const header = req.headers.authorization || '';
  return header === `Bearer ${token}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return undefined;
  return JSON.parse(raw);
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'memoria', version: VERSION, ...store.status() }));
    return;
  }

  if (url.pathname !== '/mcp') {
    res.writeHead(404).end();
    return;
  }

  if (!authorized(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const body = req.method === 'POST' ? await readBody(req) : undefined;
  await transport.handleRequest(req, res, body);
});

const host = httpHost();
const port = httpPort();
httpServer.listen(port, host, () => {
  console.log(`memoria http: http://${host}:${port}/mcp (health: /health)`);
});
