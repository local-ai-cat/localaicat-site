import { getDirectDownloadUrl, getSiteUrl } from "../../../lib/env";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function GET() {
  const directDownloadUrl = getDirectDownloadUrl();

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
}

trap cleanup EXIT

if [ ! -w "$TARGET_DIR" ]; then
  TARGET_DIR="$HOME/Applications"
  mkdir -p "$TARGET_DIR"
fi

ARCHIVE_PATH="$TMP_DIR/LocalAIChatDirect.zip"
UNPACK_DIR="$TMP_DIR/unpacked"
mkdir -p "$UNPACK_DIR"

echo "Downloading Local AI Chat from $SITE_URL"
/usr/bin/curl -fsSL "$DOWNLOAD_URL" -o "$ARCHIVE_PATH"
/usr/bin/ditto -x -k "$ARCHIVE_PATH" "$UNPACK_DIR"

APP_PATH=""
for candidate in "$UNPACK_DIR"/*.app; do
  if [ -d "$candidate" ]; then
    APP_PATH="$candidate"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "No app bundle was found in the downloaded archive." >&2
  exit 1
fi

APP_NAME=$(basename "$APP_PATH")
DESTINATION_PATH="$TARGET_DIR/$APP_NAME"
/bin/rm -rf "$DESTINATION_PATH"
/usr/bin/ditto "$APP_PATH" "$DESTINATION_PATH"

echo "Installed $APP_NAME to $TARGET_DIR"
/usr/bin/open "$DESTINATION_PATH"
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
