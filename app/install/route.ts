import { getDirectDownloadReleaseInfo } from "../../lib/direct-download-release";
import { buildDirectInstallScript } from "../../lib/install-script";

export async function GET() {
  const releaseInfo = await getDirectDownloadReleaseInfo();

  if (!releaseInfo) {
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

  const script = buildDirectInstallScript(releaseInfo);

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
