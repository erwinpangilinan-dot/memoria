#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG="$(cd "$(dirname "$0")" && pwd)"

export MEMORIA_VAULT_PATH="${MEMORIA_VAULT_PATH:-$ROOT/vault}"
export MEMORIA_DB_PATH="${MEMORIA_DB_PATH:-$ROOT/vault/.memoria/index.db}"
export MEMORIA_HTTP_HOST="${MEMORIA_HTTP_HOST:-127.0.0.1}"
export MEMORIA_HTTP_PORT="${MEMORIA_HTTP_PORT:-8765}"

cd "$PKG"
if [ ! -d node_modules ]; then
  npm install --silent
fi
exec node src/http.js
