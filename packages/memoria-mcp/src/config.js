import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..', '..');

export const EMBED_DIM = 384;

export function vaultPath() {
  return (
    process.env.MEMORIA_VAULT_PATH ||
    process.env.BRAIN_VAULT_PATH ||
    join(ROOT, 'vault')
  );
}

export function dbPath() {
  const vault = vaultPath();
  return (
    process.env.MEMORIA_DB_PATH ||
    process.env.BRAIN_DB_PATH ||
    join(vault, '.memoria', 'index.db')
  );
}

export function httpHost() {
  return process.env.MEMORIA_HTTP_HOST || '127.0.0.1';
}

export function httpPort() {
  return Number(process.env.MEMORIA_HTTP_PORT || 8765);
}

export function httpToken() {
  return process.env.MEMORIA_HTTP_TOKEN || null;
}

/** auto | mock | off — mock = deterministic vectors for tests, no model download */
export function embeddingsMode() {
  return (process.env.MEMORIA_EMBEDDINGS || 'auto').toLowerCase();
}

export function embeddingsEnabled() {
  return embeddingsMode() !== 'off';
}

export function embedModel() {
  return process.env.MEMORIA_EMBED_MODEL || 'Xenova/all-MiniLM-L6-v2';
}
