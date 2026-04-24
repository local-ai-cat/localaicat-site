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
/usr/bin/curl -fL --progress-bar "$DOWNLOAD_URL" -o "$DMG_PATH"

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
echo "==> Installing to $TARGET_DIR... *knocks things off desk*"
/bin/rm -rf "$DESTINATION_PATH"
/bin/cp -R "$APP_PATH" "$DESTINATION_PATH"
/usr/bin/xattr -cr "$DESTINATION_PATH"

echo ""
echo "  /\\\\_/\\\\  "
echo " ( ^.^ ) Installed! Launching..."
echo "  > ^ <  meow~"
echo ""
/usr/bin/open "$DESTINATION_PATH"
`;
}
