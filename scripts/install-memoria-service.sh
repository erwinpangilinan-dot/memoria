#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT="$UNIT_DIR/memoria.service"

mkdir -p "$UNIT_DIR"
sed "s|@REPO@|$REPO|g" "$REPO/systemd/memoria.service" > "$UNIT"
chmod +x "$REPO/packages/memoria-mcp/run-http.sh"

systemctl --user daemon-reload
systemctl --user enable --now memoria.service

if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$USER" 2>/dev/null || true
fi

echo "memoria service: $(systemctl --user is-active memoria.service)"
  curl -sf "http://127.0.0.1:${MEMORIA_HTTP_PORT:-8765}/health" && echo || echo "health: waiting..."
