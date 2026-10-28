import { afterResponse } from "../../../lib/site-stats";
import { downloadRedirect } from "../../../lib/counted-redirects";

export const dynamic = "force-dynamic";

/** The newest beta DMG, counted; stable when no beta is in the feed. */
export async function GET(request: Request): Promise<Response> {
  const { response, record } = await downloadRedirect(request, "beta");
  afterResponse(record);
  return response;
}
