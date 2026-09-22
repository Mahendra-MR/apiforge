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
# Uses node-gyp directly rather than the @electron/rebuild wrapper: a first
# attempt via @electron/rebuild reported "Rebuild Complete" in ~2 seconds
# (implausibly fast for compiling better-sqlite3's embedded SQLite
# amalgamation) and left no .node file behind -- and that wrapper swallows
# node-gyp's real build output on success, making it undebuggable. Running
# node-gyp directly, from inside the module's own directory (so it needs no
# --module-dir/workspace-hoisting reasoning at all), with --verbose and no
# output capture, gives real compiler output if this ever breaks again.
# --dist-url matches the header URL @electron/rebuild itself defaults to.
#
# Must run after `npm install` (better-sqlite3 has to already be present)
# and before `electron-builder --mac` packages the app.
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$DESKTOP_DIR/../.." && pwd)"
BSQLITE_DIR="$ROOT_DIR/node_modules/better-sqlite3"
ELECTRON_VERSION="$(node -p "require('$DESKTOP_DIR/package.json').devDependencies.electron")"

echo "Rebuilding better-sqlite3 for Electron $ELECTRON_VERSION via node-gyp directly"
mkdir -p "$BSQLITE_DIR/prebuilds"

for ARCH in arm64 x64; do
  echo "=== Rebuilding better-sqlite3 for darwin-$ARCH ==="
  # Clean state each time: removes leftover build/ from a prior failed
  # attempt, and (on the second loop iteration) the previous arch's
  # build/Release/better_sqlite3.node so it can't be mistaken for this one.
  rm -rf "$BSQLITE_DIR/build"

  (
    cd "$BSQLITE_DIR"
    npx --yes node-gyp rebuild \
      --arch="$ARCH" \
      --target="$ELECTRON_VERSION" \
      --dist-url=https://www.electronjs.org/headers \
      --verbose
  )

  BUILT_NODE="$BSQLITE_DIR/build/Release/better_sqlite3.node"
  if [ ! -f "$BUILT_NODE" ]; then
    echo "ERROR: node-gyp reported success but $BUILT_NODE is missing" >&2
    echo "build/Release contents:" >&2
    ls -la "$BSQLITE_DIR/build/Release" >&2 || true
    exit 1
  fi

  DEST="$BSQLITE_DIR/prebuilds/darwin-$ARCH.node"
  echo "Copying $BUILT_NODE -> $DEST"
  cp "$BUILT_NODE" "$DEST"
  ls -la "$DEST"
done

echo "=== Final prebuilds directory ==="
ls -la "$BSQLITE_DIR/prebuilds"
