cask "apiforge" do
  version "0.1.0"

  on_arm do
    # TODO: replace with the real sha256 once you've uploaded a real release asset.
    # Compute it with: shasum -a 256 APIForge-AI-#{version}-arm64.dmg
    sha256 "REPLACE_WITH_ARM64_DMG_SHA256"
    url "https://github.com/YOUR_GITHUB_USERNAME/apiforge-ai/releases/download/v#{version}/APIForge-AI-#{version}-arm64.dmg"
  end

  on_intel do
    # TODO: replace with the real sha256 once you've uploaded a real release asset.
    # Compute it with: shasum -a 256 APIForge-AI-#{version}-x64.dmg
    sha256 "REPLACE_WITH_X64_DMG_SHA256"
    url "https://github.com/YOUR_GITHUB_USERNAME/apiforge-ai/releases/download/v#{version}/APIForge-AI-#{version}-x64.dmg"
  end

  name "APIForge AI"
  desc "Lightweight, AI-assisted API testing and development platform"
  homepage "https://github.com/YOUR_GITHUB_USERNAME/apiforge-ai"

  # Unsigned build (no Apple Developer account yet) — Homebrew installs it
  # fine, but macOS Gatekeeper still blocks the first launch. Users need to
  # right-click the app -> Open (or System Settings -> Privacy & Security ->
  # "Open Anyway") once. There is no cask-level way around this without
  # signing and notarizing the build.
  app "APIForge AI.app"

  zap trash: [
    "~/Library/Application Support/APIForge AI",
    "~/Library/Preferences/dev.apiforge.desktop.plist",
    "~/Library/Saved Application State/dev.apiforge.desktop.savedState",
  ]
end
