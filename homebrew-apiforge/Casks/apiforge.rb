cask "apiforge" do
  version "0.1.0"

  on_arm do
    sha256 "2ec374c3ba0f8409dafa49f47fba129a33a377baa20287c039302d0a50332064"
    url "https://github.com/Mahendra-MR/apiforge/releases/download/v#{version}/APIForge-AI-#{version}-arm64.dmg"
  end

  on_intel do
    sha256 "671c6ed3f50f7db6a7351ea119fc59281265142cbd59dab50244cad7f0c7105c"
    url "https://github.com/Mahendra-MR/apiforge/releases/download/v#{version}/APIForge-AI-#{version}-x64.dmg"
  end

  name "APIForge AI"
  desc "Lightweight, AI-assisted API testing and development platform"
  homepage "https://github.com/Mahendra-MR/apiforge"

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
