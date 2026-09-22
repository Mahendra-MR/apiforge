# homebrew-apiforge

A [Homebrew tap](https://docs.brew.sh/Taps) for [APIForge AI](https://github.com/YOUR_GITHUB_USERNAME/apiforge-ai), so it can be installed with:

```bash
brew tap YOUR_GITHUB_USERNAME/apiforge
brew install --cask apiforge
```

## This is a placeholder, not a working tap yet

This folder was scaffolded as part of building APIForge AI's Phase 3 (desktop packaging). It won't work as-is — a handful of placeholders need to be filled in first. Here's exactly what's left, in order:

1. **Build the app** (from the `apiforge-ai` repo root):
   ```bash
   npm run dist:mac
   ```
   This produces `apps/desktop/release/APIForge-AI-<version>-arm64.dmg` and `...-x64.dmg` (Apple Silicon and Intel builds respectively).

2. **Create a real GitHub repository for this tap.** Its name must start with `homebrew-` — `homebrew-apiforge` (matching this folder's name) is the convention that makes `brew tap YOUR_GITHUB_USERNAME/apiforge` work without spelling out the full `homebrew-` prefix. Push the contents of this folder there.

3. **Create a GitHub Release on the main `apiforge-ai` repo** (not this tap repo) — tag it `v0.1.0` (or whatever version you're shipping) and upload both `.dmg` files as release assets.

4. **Compute the real checksums** of the files you just uploaded:
   ```bash
   shasum -a 256 APIForge-AI-0.1.0-arm64.dmg
   shasum -a 256 APIForge-AI-0.1.0-x64.dmg
   ```

5. **Edit `Casks/apiforge.rb`** in this folder:
   - Replace every `YOUR_GITHUB_USERNAME` with your real GitHub username (three places: the two `url` lines and the `homepage` line).
   - Replace `REPLACE_WITH_ARM64_DMG_SHA256` and `REPLACE_WITH_X64_DMG_SHA256` with the real checksums from step 4.
   - Bump the `version` line whenever you cut a new release, and repeat steps 3–4 for the new files.

6. **Commit and push** the updated cask to your `homebrew-apiforge` repo.

Once that's done, anyone (including you, on a different Mac) can install with the two commands at the top of this file.

## Unsigned build reminder

This app isn't code-signed or notarized (no Apple Developer account yet — see the main repo's README for the full story). Homebrew will install it without complaint, but macOS Gatekeeper still blocks the very first launch. The cask's `caveats`-equivalent note in `apiforge.rb` covers this, but it's worth repeating here: right-click the installed app → **Open** (and confirm in the dialog that appears), or go to **System Settings → Privacy & Security → "Open Anyway"** after the first blocked attempt. This is a one-time step per machine, not a bug in the cask.
