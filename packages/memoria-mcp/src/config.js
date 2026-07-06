import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..', '..');

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
