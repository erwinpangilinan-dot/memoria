#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMemoriaServer } from './create-server.js';
import { dbPath, vaultPath } from './config.js';
import { MemoryStore } from './store.js';

const store = new MemoryStore(dbPath(), vaultPath());
const server = createMemoriaServer(store);
const transport = new StdioServerTransport();
await server.connect(transport);
