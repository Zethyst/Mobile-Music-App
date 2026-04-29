#!/usr/bin/env bash
# setup_session.sh
# Run this ONCE locally to create your browser session and upload it to GitHub secrets.
# After this, GitHub Actions handles everything automatically.

set -euo pipefail

REPO="${1:-}"   # optional: owner/repo  e.g.  myuser/myrepo
SESSION_DIR="./yt_session"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  YouTube Cookie Refresher — First-Time Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Check dependencies ────────────────────────────────────────────────────
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 not found"; exit 1; }
command -v pip    >/dev/null 2>&1 || { echo "ERROR: pip not found"; exit 1; }

echo "[1/5] Installing Python dependencies..."
pip install playwright -q
playwright install chromium --with-deps 2>&1 | tail -5
echo "      Done."

# ── 2. Run interactive login ─────────────────────────────────────────────────
echo ""
echo "[2/5] Opening browser for login..."
echo "      A Chrome window will appear. Log into YouTube with your Google account."
echo "      Come back here and press ENTER once logged in."
echo ""
python3 refresh_cookies.py --setup

# ── 3. Verify cookies.txt was created ───────────────────────────────────────
if [ ! -f "cookies.txt" ]; then
  echo "ERROR: cookies.txt was not created. Did login succeed?"
  exit 1
fi
echo ""
echo "[3/5] cookies.txt created successfully."

# ── 4. Base64-encode the session directory ──────────────────────────────────
echo ""
echo "[4/5] Encoding session for GitHub Secrets..."
SESSION_B64=$(tar -cz -C "$SESSION_DIR" . | base64 | tr -d '\n')
echo "      Encoded session size: ${#SESSION_B64} chars"

# ── 5. Upload to GitHub (requires gh CLI) ───────────────────────────────────
echo ""
if command -v gh >/dev/null 2>&1; then
  if [ -n "$REPO" ]; then
    echo "[5/5] Uploading YT_SESSION_B64 secret to $REPO..."
    echo "$SESSION_B64" | gh secret set YT_SESSION_B64 --repo "$REPO" --body "$(cat -)"
    echo "      Secret uploaded!"
  else
    echo "[5/5] No repo specified. To upload manually, run:"
    echo "      echo '<contents>' | gh secret set YT_SESSION_B64 --repo owner/repo"
    echo ""
    echo "      Or copy this value into GitHub → Settings → Secrets → Actions:"
    echo ""
    echo "$SESSION_B64" | head -c 200
    echo "...(truncated)"
  fi
else
  echo "[5/5] gh CLI not found. Upload the secret manually:"
  echo "      Go to: https://github.com/YOUR_REPO/settings/secrets/actions"
  echo "      Create secret: YT_SESSION_B64"
  echo "      Value (copy all of this):"
  echo ""
  echo "$SESSION_B64"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo "  GitHub Actions will now auto-refresh cookies daily."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"