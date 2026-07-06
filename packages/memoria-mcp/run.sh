#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PKG="$(cd "$(dirname "$0")" && pwd)"

export MEMORIA_VAULT_PATH="${MEMORIA_VAULT_PATH:-$ROOT/vault}"
export MEMORIA_DB_PATH="${MEMORIA_DB_PATH:-$ROOT/vault/.memoria/index.db}"

cd "$PKG"
if [ ! -d node_modules ]; then
  npm install --silent
fi
exec node src/index.js
