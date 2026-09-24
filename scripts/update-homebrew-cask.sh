#!/usr/bin/env bash
#
# Updates Casks/apiforge.rb in the Homebrew tap repo (Mahendra-MR/homebrew-apiforge,
# the separate repo `brew` actually reads -- NOT the homebrew-apiforge/ folder in
# this monorepo) to match an already-published GitHub Release. The real macOS
# installers are built and published automatically by .github/workflows/release.yml
# whenever a version tag (vX.Y.Z) is pushed -- this script never builds anything
# itself. It just downloads that release's arm64/x64 .dmg files, computes their
# real sha256 checksums, rewrites the cask file in a fresh clone of the tap, and
# commits + pushes the result there, so `brew upgrade --cask apiforge` picks up
# the new version.
#
# Usage: scripts/update-homebrew-cask.sh <version>   # e.g. 0.3.0
set -euo pipefail

VERSION="${1:?Usage: scripts/update-homebrew-cask.sh <version, e.g. 0.3.0>}"
REPO="Mahendra-MR/apiforge"
TAP_REPO_URL="https://github.com/Mahendra-MR/homebrew-apiforge.git"
CASK_FILE="Casks/apiforge.rb"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Checking for a published GitHub Release for v$VERSION..."
if ! curl -sf "https://api.github.com/repos/$REPO/releases/tags/v$VERSION" \
     -H "Accept: application/vnd.github+json" > "$TMP_DIR/release.json"; then
  echo "No published release found for v$VERSION yet." >&2
  echo "The CI workflow (.github/workflows/release.yml) builds and publishes it" >&2
  echo "automatically after 'git push origin v$VERSION' -- check the Actions tab" >&2
  echo "and re-run this script once that run finishes." >&2
  exit 1
fi

ARM_URL="https://github.com/$REPO/releases/download/v$VERSION/APIForge-AI-$VERSION-arm64.dmg"
INTEL_URL="https://github.com/$REPO/releases/download/v$VERSION/APIForge-AI-$VERSION-x64.dmg"

echo "Downloading arm64 build..."
curl -sfL "$ARM_URL" -o "$TMP_DIR/arm64.dmg"
echo "Downloading x64 build..."
curl -sfL "$INTEL_URL" -o "$TMP_DIR/x64.dmg"

sha256_of() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

ARM_SHA="$(sha256_of "$TMP_DIR/arm64.dmg")"
INTEL_SHA="$(sha256_of "$TMP_DIR/x64.dmg")"

echo "arm64 sha256: $ARM_SHA"
echo "x64   sha256: $INTEL_SHA"

echo "Cloning the Homebrew tap..."
git clone -q "$TAP_REPO_URL" "$TMP_DIR/tap"
cd "$TMP_DIR/tap"

python3 - "$CASK_FILE" "$VERSION" "$ARM_SHA" "$INTEL_SHA" <<'PYEOF'
import re
import sys

path, version, arm_sha, intel_sha = sys.argv[1:5]
content = open(path).read()

content = re.sub(r'version "[^"]+"', f'version "{version}"', content, count=1)

# The arm64 block's sha256 is the first one in the file, on_intel's is the
# second -- split on the on_intel block boundary so each gets the right hash.
before_intel, after_intel = content.split("on_intel", 1)
before_intel = re.sub(r'sha256 "[a-f0-9]+"', f'sha256 "{arm_sha}"', before_intel, count=1)
after_intel = re.sub(r'sha256 "[a-f0-9]+"', f'sha256 "{intel_sha}"', after_intel, count=1)
content = "on_intel".join([before_intel, after_intel])

open(path, "w").write(content)
print(f"{path}: version -> {version}, checksums updated")
PYEOF

if git diff --quiet -- "$CASK_FILE"; then
  echo "Tap already points at v$VERSION with these checksums -- nothing to push."
  exit 0
fi

git add "$CASK_FILE"
git -c user.name="Mahendra" -c user.email="mrmahendra1206@gmail.com" commit -m "Update apiforge cask to v$VERSION

Points the arm64/x64 sha256 checksums and download URLs at the v$VERSION
GitHub Release that CI already built and published."

git push origin main

echo "Done -- brew upgrade --cask apiforge will now offer $VERSION."
