import type { DirectDownloadReleaseInfo } from "./direct-download-release";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function buildDirectInstallScript({
  build,
  downloadUrl,
  publishedAt,
  version
}: DirectDownloadReleaseInfo) {
  const releaseMeta = [
    version ? `Version ${version}` : null,
    build ? `Build ${build}` : null,
    publishedAt ? publishedAt : null
  ]
    .filter(Boolean)
    .join(" · ");

  return `#!/bin/sh
set -eu

DOWNLOAD_URL=${shellQuote(downloadUrl)}
RELEASE_META=${shellQuote(releaseMeta)}
TMP_DIR=$(mktemp -d)
TARGET_DIR="/Applications"
if [ -t 1 ]; then
  RESET=$(printf '\\033[0m')
  TEXT=$(printf '\\033[38;5;252m')
  BLUE=$(printf '\\033[38;5;111m')
  CYAN=$(printf '\\033[38;5;117m')
  PINK=$(printf '\\033[38;5;218m')
else
  RESET=""
  TEXT=""
  BLUE=""
  CYAN=""
  PINK=""
fi

print_banner() {
  printf "\\n"
  printf "  %s/%s\\\\_%s/%s\\\\%s\\n" "$PINK" "$BLUE" "$PINK" "$BLUE" "$RESET"
  printf " %s(%s %so%s.%so %s)%s %sLocal%s %sAI%s %sCat%s\\n" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$RESET" "$TEXT" "$RESET" "$BLUE" "$RESET" "$PINK" "$RESET"
  printf "  %s>%s %s^%s %s<%s  %sOutdoor Cat%s" "$CYAN" "$RESET" "$TEXT" "$RESET" "$CYAN" "$RESET" "$BLUE" "$RESET"
  if [ -n "$RELEASE_META" ]; then
    printf " · %s%s%s" "$TEXT" "$RELEASE_META" "$RESET"
  fi
  printf "\\n"
  printf "\\n"
}

print_done_banner() {
  printf "\\n"
  printf "  %s/%s\\\\_%s/%s\\\\%s\\n" "$PINK" "$BLUE" "$PINK" "$BLUE" "$RESET"
  printf " %s(%s %s^%s.%s^ %s)%s %sInstalled! Launching...%s\\n" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$RESET" "$TEXT" "$RESET"
  printf "  %s>%s %s^%s %s<%s  %smeow~%s\\n" "$CYAN" "$RESET" "$TEXT" "$RESET" "$CYAN" "$RESET" "$PINK" "$RESET"
  printf "\\n"
}

print_appstore_conflict() {
  existing_path="$1"
  printf "\\n"
  printf "  %s/%s\\\\_%s/%s\\\\%s\\n" "$PINK" "$BLUE" "$PINK" "$BLUE" "$RESET"
  printf " %s(%s %s=%s.%s= %s)%s %sHmm, this cat is already home%s\\n" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$RESET" "$TEXT" "$RESET"
  printf "  %s>%s %s-%s %s<%s\\n" "$CYAN" "$RESET" "$TEXT" "$RESET" "$CYAN" "$RESET"
  printf "\\n"
  printf "%sLooks like an App Store / TestFlight copy is already installed at:%s\\n" "$TEXT" "$RESET"
  printf "  %s%s%s\\n\\n" "$BLUE" "$existing_path" "$RESET"
  printf "%sThe Outdoor Cat (direct-download) build can't replace it because the App%s\\n" "$TEXT" "$RESET"
  printf "%sStore version is owned by the system. Pick one of these, then re-run%s\\n" "$TEXT" "$RESET"
  printf "%sthe installer:%s\\n\\n" "$TEXT" "$RESET"
  printf "  %s1.%s Drag it from /Applications to the Trash in Finder.\\n" "$PINK" "$RESET"
  printf "  %s2.%s Terminal one-liner:\\n" "$PINK" "$RESET"
  printf "       %ssudo rm -rf %s\"%s\"%s\\n" "$CYAN" "$PINK" "$existing_path" "$RESET"
  printf "  %s3.%s Finder shortcut (pro tip 🐾):\\n" "$PINK" "$RESET"
  printf "       open /Applications, click %s\"Local AI Chat\"%s, press %s%s⌘ ⌫%s\\n" "$BLUE" "$RESET" "$CYAN" "$PINK" "$RESET"
  printf "       to move it to Trash, then %s%s⌘ ⇧ ⌫%s to empty the Trash.\\n" "$CYAN" "$PINK" "$RESET"
  printf "\\n"
  printf "  %scurl -fsSL https://localaicat.com/install | sh%s\\n\\n" "$CYAN" "$RESET"
}

cleanup() {
  rm -rf "$TMP_DIR"
  /usr/bin/hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
}

trap cleanup EXIT

if [ ! -w "$TARGET_DIR" ]; then
  TARGET_DIR="$HOME/Applications"
  mkdir -p "$TARGET_DIR"
fi

DMG_PATH="$TMP_DIR/LocalAIChatDirect.dmg"
MOUNT_POINT=""

print_banner
echo "==> Downloading..."
# Use curl's default progress meter (speed + ETA) instead of --progress-bar.
# --progress-bar renders as nearly-blank whitespace for the first few seconds
# at low percentages, which looks like a stalled/broken bar to users.
/usr/bin/curl -fL "$DOWNLOAD_URL" -o "$DMG_PATH"

echo "==> Mounting... *paws at disk*"
HDIUTIL_OUT=$(/usr/bin/hdiutil attach "$DMG_PATH" -nobrowse -readonly)
MOUNT_POINT=$(echo "$HDIUTIL_OUT" | grep -o '/Volumes/.*' | head -1)

APP_PATH=""
for candidate in "$MOUNT_POINT"/*.app; do
  if [ -d "$candidate" ]; then
    APP_PATH="$candidate"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "==> Meow! No app bundle found in DMG." >&2
  exit 1
fi

APP_NAME=$(basename "$APP_PATH")
DESTINATION_PATH="$TARGET_DIR/$APP_NAME"

if [ -e "$DESTINATION_PATH" ]; then
  if [ -e "$DESTINATION_PATH/Contents/_MASReceipt" ] || [ ! -w "$DESTINATION_PATH" ]; then
    print_appstore_conflict "$DESTINATION_PATH"
    exit 1
  fi
fi

echo "==> Installing to $TARGET_DIR... *knocks things off desk*"
/bin/rm -rf "$DESTINATION_PATH"
/bin/cp -R "$APP_PATH" "$DESTINATION_PATH"
/usr/bin/xattr -cr "$DESTINATION_PATH"

print_done_banner
/usr/bin/open "$DESTINATION_PATH"
`;
}
