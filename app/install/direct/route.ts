import { getDirectDownloadUrl, getSiteUrl } from "../../../lib/env";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function GET() {
  const directDownloadUrl = getDirectDownloadUrl()?.trim();

  if (!directDownloadUrl) {
    return new Response(
      "#!/bin/sh\n" +
        "echo 'Direct download is not configured on this deployment yet.' >&2\n" +
        "exit 1\n",
      {
        status: 503,
        headers: {
          "Content-Type": "text/x-shellscript; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const siteURL = getSiteUrl().replace(/\/$/, "");
  const script = `#!/bin/sh
set -eu

DOWNLOAD_URL=${shellQuote(directDownloadUrl)}
SITE_URL=${shellQuote(siteURL)}
TMP_DIR=$(mktemp -d)
TARGET_DIR="/Applications"

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

echo "Downloading Local AI Cat from $SITE_URL..."
/usr/bin/curl -fsSL "$DOWNLOAD_URL" -o "$DMG_PATH"

echo "Mounting..."
MOUNT_POINT=$(/usr/bin/hdiutil attach "$DMG_PATH" -nobrowse -readonly | tail -1 | awk '{print $NF}')

APP_PATH=""
for candidate in "$MOUNT_POINT"/*.app; do
  if [ -d "$candidate" ]; then
    APP_PATH="$candidate"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "No app bundle found in DMG." >&2
  exit 1
fi

APP_NAME=$(basename "$APP_PATH")
DESTINATION_PATH="$TARGET_DIR/$APP_NAME"
echo "Installing $APP_NAME to $TARGET_DIR..."
/bin/rm -rf "$DESTINATION_PATH"
/bin/cp -R "$APP_PATH" "$DESTINATION_PATH"
/usr/bin/xattr -cr "$DESTINATION_PATH"

echo "Installed! Launching..."
/usr/bin/open "$DESTINATION_PATH"
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
