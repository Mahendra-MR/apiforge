cask "apiforge" do
  version "0.2.0"

  on_arm do
    sha256 "a81b8c9430c6d20659ea5d30ca88ffc517a1c2b83f947becbff7208cb23c0a5b"
    url "https://github.com/Mahendra-MR/apiforge/releases/download/v#{version}/APIForge-AI-#{version}-arm64.dmg"
  end

  on_intel do
    sha256 "d47d6481e996a8824dd87513bc3658164040df8eb308de8486f177136463d4ea"
    url "https://github.com/Mahendra-MR/apiforge/releases/download/v#{version}/APIForge-AI-#{version}-x64.dmg"
  end

  name "APIForge AI"
  desc "Lightweight, AI-assisted API testing and development platform"
  homepage "https://github.com/Mahendra-MR/apiforge"

  # Unsigned build (no Apple Developer account yet). Modern macOS refuses to
  # even show the old "unidentified developer -> Open Anyway" prompt for a
  # zero-signature app — it just says the app "is damaged and can't be
  # opened," which is Gatekeeper's wording for "no valid signature," not
  # actual corruption. Stripping the quarantine flag Homebrew/macOS attaches
  # on download avoids that dialog entirely, so do it automatically instead
  # of asking every user to run xattr by hand.
  app "APIForge AI.app"

  postflight do
    system_command "/usr/bin/xattr",
                    args: ["-cr", "#{appdir}/APIForge AI.app"]
  end

  zap trash: [
    "~/Library/Application Support/APIForge AI",
    "~/Library/Preferences/dev.apiforge.desktop.plist",
    "~/Library/Saved Application State/dev.apiforge.desktop.savedState",
  ]
end
