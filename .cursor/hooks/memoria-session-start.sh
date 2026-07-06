#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export MEMORIA_VAULT_PATH="${MEMORIA_VAULT_PATH:-$ROOT/vault}"
export MEMORIA_DB_PATH="${MEMORIA_DB_PATH:-$ROOT/vault/.memoria/index.db}"
node "$ROOT/packages/memoria-mcp/scripts/session-recall.js"
