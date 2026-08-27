#!/bin/sh
# Sandboxed version of the install script for VHS recording
# This version installs to a temp directory and doesn't launch the app
set -eu

DOWNLOAD_URL='https://github.com/local-ai-cat/localaicat-site/releases/latest/download/LocalAIChatDirect.dmg'
RELEASE_META='Version 1.4.0 · Build 238 · 2026-07-09'
TMP_DIR=$(mktemp -d)
# SANDBOXED: Install to temp directory instead of /Applications
TARGET_DIR="$TMP_DIR/demo-install"
mkdir -p "$TARGET_DIR"

if [ -t 1 ]; then
  RESET=$(printf '\033[0m')
  TEXT=$(printf '\033[38;5;252m')
  BLUE=$(printf '\033[38;5;111m')
  CYAN=$(printf '\033[38;5;117m')
  PINK=$(printf '\033[38;5;218m')
else
  RESET=""
  TEXT=""
  BLUE=""
  CYAN=""
  PINK=""
fi

print_banner() {
  printf "\n"
  printf "  %s/%s\\_%s/%s\\%s\n" "$PINK" "$BLUE" "$PINK" "$BLUE" "$RESET"
  printf " %s(%s %so%s.%so %s)%s %sLocal%s %sAI%s %sCat%s\n" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$RESET" "$TEXT" "$RESET" "$BLUE" "$RESET" "$PINK" "$RESET"
  printf "  %s>%s %s^%s %s<%s  %sOutdoor Cat%s" "$CYAN" "$RESET" "$TEXT" "$RESET" "$CYAN" "$RESET" "$BLUE" "$RESET"
  if [ -n "$RELEASE_META" ]; then
    printf " · %s%s%s" "$TEXT" "$RELEASE_META" "$RESET"
  fi
  printf "\n"
  printf "\n"
}

print_done_banner() {
  printf "\n"
  printf "  %s/%s\\_%s/%s\\%s\n" "$PINK" "$BLUE" "$PINK" "$BLUE" "$RESET"
  printf " %s(%s %s^%s.%s^ %s)%s %sInstalled! Launching...%s\n" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$TEXT" "$BLUE" "$RESET" "$TEXT" "$RESET"
  printf "  %s>%s %s^%s %s<%s  %smeow~%s\n" "$CYAN" "$RESET" "$TEXT" "$RESET" "$CYAN" "$RESET" "$PINK" "$RESET"
  printf "\n"
}

cleanup() {
  rm -rf "$TMP_DIR"
  /usr/bin/hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
}

trap cleanup EXIT

DMG_PATH="$TMP_DIR/LocalAIChatDirect.dmg"
MOUNT_POINT=""

print_banner
echo "==> Downloading..."
FINAL_URL=$(/usr/bin/curl -fsIL -o /dev/null -w '%{url_effective}' "$DOWNLOAD_URL" || true)
FINAL_URL=${FINAL_URL:-$DOWNLOAD_URL}
/usr/bin/curl -fL --progress-bar "$FINAL_URL" -o "$DMG_PATH"

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

# Show /Applications in the output even though we're installing elsewhere
echo "==> Installing to /Applications... *knocks things off desk*"
/bin/rm -rf "$DESTINATION_PATH"
/bin/cp -R "$APP_PATH" "$DESTINATION_PATH"
/usr/bin/xattr -cr "$DESTINATION_PATH"

print_done_banner
# SANDBOXED: Don't actually open the app - just show the success message
sleep 1
