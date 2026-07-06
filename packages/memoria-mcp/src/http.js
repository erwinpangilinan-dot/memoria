#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createMemoriaServer } from './create-server.js';
import { dbPath, httpHost, httpPort, httpToken, vaultPath } from './config.js';
import { MemoryStore } from './store.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const VERSION = '0.4.0';
const store = new MemoryStore(dbPath(), vaultPath());
/** @type {Map<string, { transport: StreamableHTTPServerTransport, mcp: ReturnType<typeof createMemoriaServer> }>} */
const sessions = new Map();

async function createSession() {
  let sessionId = null;
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessionId = id;
      sessions.set(id, { transport, mcp });
    },
    onsessionclosed: async (id) => {
      const session = sessions.get(id);
      sessions.delete(id);
      await session?.mcp.close().catch(() => {});
    },
  });
  const mcp = createMemoriaServer(store, VERSION);
  await mcp.connect(transport);
  return { transport, mcp, getSessionId: () => sessionId };
}

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

function isInitializeBody(body) {
  const messages = Array.isArray(body) ? body : body ? [body] : [];
  return messages.some((m) => m?.method === 'initialize');
}

async function resolveTransport(req, body) {
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    return session.transport;
  }
  if (req.method === 'POST' && isInitializeBody(body)) {
    const session = await createSession();
    return session.transport;
  }
  return null;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'memoria',
        version: VERSION,
        sessions: sessions.size,
        ...store.status(),
      })
    );
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
  const transport = await resolveTransport(req, body);
  if (!transport) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unknown or expired session; send initialize without mcp-session-id' }));
    return;
  }
  await transport.handleRequest(req, res, body);
});

const host = httpHost();
const port = httpPort();
httpServer.listen(port, host, () => {
  console.log(`memoria http: http://${host}:${port}/mcp (health: /health)`);
});
