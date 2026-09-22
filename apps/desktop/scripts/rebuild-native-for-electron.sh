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
# --force_build=1 is what actually makes the compile happen. better-sqlite3's
# binding.gyp sets its targets to 'type': 'none' -- a no-op that compiles
# nothing and only touches a .stamp file -- whenever a prebuild already
# exists for the host, which it always does here (it ships prebuilds for
# every platform). Its own release script does the same thing:
#   "build-release": "node-gyp clean && node-gyp rebuild --release --force_build=1"
# Without that flag, node-gyp exits 0 having built nothing at all, which is
# exactly how the stale Node-ABI prebuild survived and crashed the app.
#
# Uses node-gyp directly rather than the @electron/rebuild wrapper, which
# swallows node-gyp's output on success and so hid the silent no-op. Run
# from inside the module's own directory, so there's no --module-dir /
# workspace-hoisting resolution to get wrong. --dist-url matches the header
# URL @electron/rebuild itself defaults to.
#
# NOTE: gyp cannot handle spaces in paths (nodejs/node-gyp#65), so this
# won't run from a checkout under a directory like "personal projects".
# CI is unaffected (/Users/runner/work/...).
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
      --force_build=1 \
      --arch="$ARCH" \
      --target="$ELECTRON_VERSION" \
      --dist-url=https://www.electronjs.org/headers
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
