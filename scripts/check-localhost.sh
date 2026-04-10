#!/bin/zsh

set -euo pipefail

PORT="${PORT:-3000}"
URL="${URL:-http://localhost:$PORT}"
FALLBACK_URL="${FALLBACK_URL:-http://127.0.0.1:$PORT}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl no esta disponible en esta terminal."
  exit 1
fi

used_url="$URL"

if ! response="$(curl -4 -sSI --max-time 3 "$URL" 2>/dev/null)"; then
  if [[ "$URL" == "http://localhost:$PORT" ]] && response="$(curl -sSI --max-time 3 "$FALLBACK_URL" 2>/dev/null)"; then
    used_url="$FALLBACK_URL"
  else
    echo "DOWN $URL"
    exit 1
  fi
fi

status_line="$(printf "%s\n" "$response" | head -n 1 | tr -d '\r')"
location_line="$(printf "%s\n" "$response" | rg '^location:' -i | tr -d '\r' || true)"

echo "UP $used_url"
echo "$status_line"

if [ -n "$location_line" ]; then
  echo "$location_line"
fi
