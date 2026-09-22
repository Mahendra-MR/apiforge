#!/usr/bin/env bash
# better-sqlite3 ships prebuilt binaries for plain Node.js, but Electron has
# its own ABI (different V8 build, BoringSSL instead of OpenSSL, etc.), so
# those prebuilds are not guaranteed to load inside Electron even though
# better-sqlite3 uses N-API. This script rebuilds the native addon
# specifically against the Electron version this app ships, for BOTH
# architectures electron-builder packages from this single (arm64) CI
# runner, and installs each result where better-sqlite3's own loader
# (lib/binding.js -> getPrebuildPath()) looks first at runtime:
#   node_modules/better-sqlite3/prebuilds/darwin-<arch>.node
#
# Must run after `npm install` (better-sqlite3 has to already be present)
# and before `electron-builder --mac` packages the app.
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/../.." && pwd)"
BSQLITE_DIR="$ROOT_DIR/node_modules/better-sqlite3"
ELECTRON_VERSION="$(node -p "require('$DESKTOP_DIR/package.json').devDependencies.electron")"

echo "Rebuilding better-sqlite3 for Electron $ELECTRON_VERSION (project root: $ROOT_DIR)"
mkdir -p "$BSQLITE_DIR/prebuilds"

for ARCH in arm64 x64; do
  echo "=== Rebuilding better-sqlite3 for darwin-$ARCH ==="
  # --module-dir must be the directory that CONTAINS package.json (this
  # monorepo's root, where deps are hoisted to node_modules/), not the
  # node_modules folder itself -- @electron/rebuild's ModuleWalker reads
  # <module-dir>/package.json to find the dependency tree to rebuild.
  npx --yes @electron/rebuild \
    --force \
    --which-module better-sqlite3 \
    --version "$ELECTRON_VERSION" \
    --arch "$ARCH" \
    --module-dir "$ROOT_DIR"

  BUILT_NODE="$BSQLITE_DIR/build/Release/better_sqlite3.node"
  if [ ! -f "$BUILT_NODE" ]; then
    echo "ERROR: expected rebuilt binary not found at $BUILT_NODE" >&2
    exit 1
  fi

  DEST="$BSQLITE_DIR/prebuilds/darwin-$ARCH.node"
  echo "Copying $BUILT_NODE -> $DEST"
  cp "$BUILT_NODE" "$DEST"
  ls -la "$DEST"
done

echo "=== Final prebuilds directory ==="
ls -la "$BSQLITE_DIR/prebuilds"
