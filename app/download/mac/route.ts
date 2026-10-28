import { afterResponse } from "../../../lib/site-stats";
import { downloadRedirect } from "../../../lib/counted-redirects";

export const dynamic = "force-dynamic";

/** The Mac download button: counted, then on to the same GitHub DMG as before. */
export async function GET(request: Request): Promise<Response> {
  const { response, record } = await downloadRedirect(request, "stable");
  afterResponse(record);
  return response;
}
