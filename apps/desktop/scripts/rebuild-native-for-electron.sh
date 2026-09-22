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
  MARKER="$(mktemp)"
  sleep 1 # ensure the marker is strictly older than anything rebuilt below

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

  # Don't assume exactly which directory @electron/rebuild left the rebuilt
  # binary in (it writes the raw node-gyp output under build/Release/, and
  # separately copies it under bin/<platform>-<arch>-<abi>/ unless
  # --disable-pre-gyp-copy was passed) -- just find whatever *.node file it
  # just produced under the module, by modification time.
  # (macOS ships BSD find, which has no -quit action like GNU find does, so
  # just take the first line of plain output.)
  BUILT_NODE="$(find "$BSQLITE_DIR" -name '*.node' -newer "$MARKER" | head -n 1)"
  rm -f "$MARKER"
  if [ -z "$BUILT_NODE" ]; then
    echo "ERROR: no rebuilt .node file found under $BSQLITE_DIR after rebuilding for darwin-$ARCH" >&2
    echo "Directory contents for debugging:" >&2
    find "$BSQLITE_DIR" -name '*.node' >&2 || true
    exit 1
  fi

  DEST="$BSQLITE_DIR/prebuilds/darwin-$ARCH.node"
  echo "Copying $BUILT_NODE -> $DEST"
  cp "$BUILT_NODE" "$DEST"
  ls -la "$DEST"
done

echo "=== Final prebuilds directory ==="
ls -la "$BSQLITE_DIR/prebuilds"
