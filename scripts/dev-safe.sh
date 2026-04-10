#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"
DEV_HOST="${DEV_HOST:-127.0.0.1}"

add_path_if_exists() {
  local candidate="$1"
  if [ -d "$candidate" ] && [[ ":$PATH:" != *":$candidate:"* ]]; then
    PATH="$candidate:$PATH"
  fi
}

add_path_if_exists "/usr/local/bin"
add_path_if_exists "/opt/homebrew/bin"
add_path_if_exists "$HOME/.volta/bin"
add_path_if_exists "$HOME/.asdf/shims"

if [ -d "$HOME/.nvm/versions/node" ]; then
  local latest_nvm_bin
  latest_nvm_bin="$(find "$HOME/.nvm/versions/node" -maxdepth 2 -type d -name bin 2>/dev/null | sort | tail -n 1)"
  if [ -n "${latest_nvm_bin:-}" ]; then
    add_path_if_exists "$latest_nvm_bin"
  fi
fi

export PATH

if ! command -v node >/dev/null 2>&1; then
  echo "No se encontro 'node' en PATH."
  echo "Prueba instalando Node o agregando /usr/local/bin a tu shell."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "No se encontro 'npm' en PATH."
  echo "Node detectado en: $(command -v node)"
  exit 1
fi

if lsof -iTCP:"$PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "Ya hay un proceso escuchando en $DEV_HOST:$PORT."
  echo "Abre http://$DEV_HOST:$PORT o usa scripts/check-localhost.sh."
  exit 0
fi

echo "Usando node: $(command -v node) ($(node -v))"
echo "Usando npm:  $(command -v npm)"
echo "Levantando Next.js en http://$DEV_HOST:$PORT"

exec npm run dev -- --hostname "$DEV_HOST" --port "$PORT"
