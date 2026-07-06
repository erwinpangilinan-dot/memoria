#!/usr/bin/env bash
# Install Memoria MCP + skill + hooks for all Cursor projects (user-global ~/.cursor/).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
CURSOR_DIR="${CURSOR_DIR:-$HOME/.cursor}"
MEMORIA_HOME="${MEMORIA_HOME:-$REPO}"

mkdir -p "$CURSOR_DIR/hooks" "$CURSOR_DIR/skills" "$CURSOR_DIR/rules"

cat > "$CURSOR_DIR/memoria.env" <<EOF
# Central Memoria install (used by global Cursor hooks). Override MEMORIA_HOME if needed.
MEMORIA_HOME=$MEMORIA_HOME
EOF

cat > "$CURSOR_DIR/mcp.json" <<'EOF'
{
  "mcpServers": {
    "memoria": {
      "url": "http://127.0.0.1:8765/mcp"
    }
  }
}
EOF

cat > "$CURSOR_DIR/hooks.json" <<'EOF'
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "./hooks/memoria-session-start.sh"
      }
    ],
    "sessionEnd": [
      {
        "command": "./hooks/memoria-session-log.sh"
      }
    ]
  }
}
EOF

cat > "$CURSOR_DIR/hooks/memoria-session-start.sh" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
CURSOR_DIR="${CURSOR_DIR:-$HOME/.cursor}"
# shellcheck disable=SC1091
source "$CURSOR_DIR/memoria.env"
export MEMORIA_VAULT_PATH="${MEMORIA_VAULT_PATH:-$MEMORIA_HOME/vault}"
export MEMORIA_DB_PATH="${MEMORIA_DB_PATH:-$MEMORIA_HOME/vault/.memoria/index.db}"
node "$MEMORIA_HOME/packages/memoria-mcp/scripts/session-recall.js"
HOOK

cat > "$CURSOR_DIR/hooks/memoria-session-log.sh" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
CURSOR_DIR="${CURSOR_DIR:-$HOME/.cursor}"
# shellcheck disable=SC1091
source "$CURSOR_DIR/memoria.env"
export MEMORIA_VAULT_PATH="${MEMORIA_VAULT_PATH:-$MEMORIA_HOME/vault}"
node "$MEMORIA_HOME/packages/memoria-mcp/scripts/log-session.js" "$@"
HOOK

chmod +x "$CURSOR_DIR/hooks/memoria-session-start.sh" "$CURSOR_DIR/hooks/memoria-session-log.sh"

ln -sfn "$REPO/.cursor/skills/memoria" "$CURSOR_DIR/skills/memoria"

cat > "$CURSOR_DIR/rules/memoria-session.mdc" <<EOF
---
description: Load Memoria auto-recall context at session start
alwaysApply: true
---

# Memoria session context

Memoria MCP is available in every project (\`memoria_recall\`, \`memoria_remember\`, etc.). Central vault: \`$MEMORIA_HOME/vault\`.

At the start of each conversation, read \`$MEMORIA_HOME/vault/.memoria/session-context.md\` if it exists (refreshed by the sessionStart hook). Prefer this over chat history for durable facts. Cite vault paths when helpful.

If the file is missing or empty, call \`memoria_recall\` with a query from the user's request.

When the user shares durable facts, use \`memoria_remember\` with \`[[Entity]]\` wikilinks and \`importance: high\` when they say "remember this".
EOF

PROJECT_MCP="$REPO/.cursor/mcp.json"
if [[ -f "$PROJECT_MCP" ]]; then
  node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (j.mcpServers?.memoria) {
      delete j.mcpServers.memoria;
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
      console.log('Removed duplicate memoria from', p);
    }
  " "$PROJECT_MCP"
fi

for stale in \
  "$REPO/.cursor/hooks.json" \
  "$REPO/.cursor/hooks/memoria-session-start.sh" \
  "$REPO/.cursor/hooks/memoria-session-log.sh" \
  "$REPO/.cursor/rules/memoria-session.mdc"
do
  if [[ -f "$stale" ]]; then
    rm -f "$stale"
    echo "Removed project duplicate: $stale"
  fi
done

echo "Global Memoria Cursor setup:"
echo "  MCP:       $CURSOR_DIR/mcp.json"
echo "  Hooks:     $CURSOR_DIR/hooks.json"
echo "  Skill:     $CURSOR_DIR/skills/memoria -> $REPO/.cursor/skills/memoria"
echo "  Rule:      $CURSOR_DIR/rules/memoria-session.mdc"
echo "  Vault:     $MEMORIA_HOME/vault"
echo ""
echo "Ensure memoria HTTP service is running: curl -sf http://127.0.0.1:8765/health"
echo "Reload Cursor (Developer: Reload Window) to pick up MCP + hooks."
