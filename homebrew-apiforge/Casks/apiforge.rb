cask "apiforge" do
  version "0.1.0"

  on_arm do
    sha256 "0a522b9c83bb1d87e0e6f5e09160cfc746f735063057b103bb682507cf5cb4c6"
    url "https://github.com/Mahendra-MR/apiforge/releases/download/v#{version}/APIForge-AI-#{version}-arm64.dmg"
  end

  on_intel do
    sha256 "eb1a5b41ce56659ced7c39d39d89f40b74b8e1c4b135922bd8b39c7ecc9ef1dd"
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
