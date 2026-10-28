import { afterResponse } from "../../../lib/site-stats";
import { updateFeedRedirect } from "../../../lib/counted-redirects";

export const dynamic = "force-dynamic";

/** Sparkle's update feed: counted, then redirected to GitHub's appcast, so the app reads the same bytes. */
export function GET(request: Request): Response {
  const { response, record } = updateFeedRedirect(request);
  afterResponse(record);
  return response;
}
