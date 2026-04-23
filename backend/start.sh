#!/bin/zsh
# LaunchAgents have almost no PATH — node is often 127 "not found" without this.
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin"

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"

# Prefer Homebrew /usr/local node so `exec` always finds a binary
NODE_BIN=""
for c in /opt/homebrew/bin/node /usr/local/bin/node; do
  if [[ -x "$c" ]]; then
    NODE_BIN=$c
    break
  fi
done
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN=$(command -v node 2>/dev/null || true)
fi
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "start.sh: no node found in PATH or standard locations" >&2
  exit 127
fi

if [[ -f "$BACKEND_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$BACKEND_DIR/.env"
  set +a
fi

# LaunchAgent + Cloudflare tunnel: use 8031 so `npm run dev` can keep PORT 8000.
# Point ~/.cloudflared/config.yml ingress at http://127.0.0.1:8031 (see cloudflared.example.yml).
export PORT="${ZETHYST_TUNNEL_PORT:-8031}"

exec "$NODE_BIN" "$BACKEND_DIR/dist/server.js"
