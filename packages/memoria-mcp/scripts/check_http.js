#!/usr/bin/env node
/** ponytail: start HTTP server, hit /health, exit. */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpVault = mkdtempSync(join(tmpdir(), 'memoria-http-'));
const port = 18765;
const env = {
  ...process.env,
  MEMORIA_VAULT_PATH: tmpVault,
  MEMORIA_DB_PATH: join(tmpVault, '.memoria', 'index.db'),
  MEMORIA_HTTP_PORT: String(port),
  MEMORIA_HTTP_HOST: '127.0.0.1',
};

const child = spawn('node', ['src/http.js'], { cwd: pkg, env, stdio: ['ignore', 'pipe', 'pipe'] });

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

try {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) {
        const body = await res.json();
        if (body.ok && body.service === 'memoria') {
          console.log('check_http: ok');
          process.exit(0);
        }
      }
    } catch {
      /* retry */
    }
    await wait(100);
  }
  throw new Error('health check timed out');
} finally {
  child.kill('SIGTERM');
  rmSync(tmpVault, { recursive: true, force: true });
}
