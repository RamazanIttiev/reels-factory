#!/usr/bin/env bash
# Run this yourself in the project folder. It copies values from your local .env into GitHub Actions secrets
# without printing them. Needs `gh` logged in with repo access.
set -euo pipefail
REPO="RamazanIttiev/reels-factory"
SECRETS=(R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET PUBLIC_VIDEO_BASE_URL INSTAGRAM_ACCESS_TOKEN INSTAGRAM_USER_ID ELEVENLABS_API_KEY ANTHROPIC_API_KEY TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID)
set -a; . ./.env; set +a
for name in "${SECRETS[@]}"; do
  value="${!name:-}"
  if [ -z "$value" ]; then echo "skip $name (empty in .env)"; continue; fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO" --body - >/dev/null && echo "set $name"
done
gh variable set TTS_PROVIDER --repo "$REPO" --body "elevenlabs"
gh variable set GRAPH_API_VERSION --repo "$REPO" --body "${GRAPH_API_VERSION:-v27.0}"
gh variable set AUDIENCE_TZ --repo "$REPO" --body "Europe/Moscow"
echo done
