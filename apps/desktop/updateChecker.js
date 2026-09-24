/**
 * Checks GitHub for a newer release than the one currently running and, if
 * found, shows a native dialog offering to open its release page.
 *
 * There's no in-app auto-install here: the app is unsigned (no Apple
 * Developer certificate yet), and macOS's real auto-update mechanism
 * (Squirrel.Mac, via electron-updater) requires a signed app before it will
 * install an update — see https://www.electron.build/docs/features/auto-update/.
 * Until the app is signed and notarized, the dialog hands over the one
 * command that updates a Homebrew install (copied to the clipboard), or
 * opens the release page for anyone who installed the .dmg by hand.
 */
const { clipboard, dialog, shell } = require("electron");
const https = require("node:https");

const REPO = "Mahendra-MR/apiforge";
const RELEASE_API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const BREW_UPGRADE_COMMAND = "brew update && brew upgrade --cask apiforge";

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const request = https.get(
      RELEASE_API_URL,
      { headers: { "User-Agent": "APIForge", Accept: "application/vnd.github+json" } },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume(); // drain so the socket can be released
          reject(new Error(`GitHub API returned ${response.statusCode}`));
          return;
        }
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(10_000, () => request.destroy(new Error("GitHub API request timed out")));
  });
}

/**
 * Compares two "x.y.z" version strings (a leading "v" is ignored on either
 * side). Returns true when `latest` is newer than `current`.
 */
function isNewerVersion(current, latest) {
  const parse = (version) =>
    version
      .replace(/^v/, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const currentParts = parse(current);
  const latestParts = parse(latest);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] ?? 0;
    const latestPart = latestParts[i] ?? 0;
    if (latestPart !== currentPart) return latestPart > currentPart;
  }
  return false;
}

/**
 * Checks once for a newer release and, if one exists, shows a dialog
 * offering to open its GitHub release page. Fails silently (logged, not
 * shown to the user) on any network error — a background version check
 * should never interrupt someone who's just trying to use the app.
 */
async function checkForUpdate(currentVersion, parentWindow) {
  let release;
  try {
    release = await fetchLatestRelease();
  } catch (error) {
    console.error("Update check failed:", error);
    return;
  }

  if (!release?.tag_name || !isNewerVersion(currentVersion, release.tag_name)) return;

  const { response } = await dialog.showMessageBox(parentWindow, {
    type: "info",
    title: "Update available",
    message: `APIForge ${release.tag_name} is available`,
    detail:
      `You're running ${currentVersion}. Installed with Homebrew? Run this in Terminal, then reopen APIForge:\n\n` +
      `${BREW_UPGRADE_COMMAND}\n\nOtherwise, download the new version from the release page.`,
    buttons: ["Copy Homebrew Command", "Open Release Page", "Later"],
    defaultId: 0,
    cancelId: 2,
  });

  if (response === 0) {
    clipboard.writeText(BREW_UPGRADE_COMMAND);
  } else if (response === 1) {
    shell.openExternal(release.html_url ?? `https://github.com/${REPO}/releases/latest`);
  }
}

module.exports = { checkForUpdate, isNewerVersion };
