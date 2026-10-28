import { after } from "next/server";
import { downloadRedirect } from "../../../lib/counted-redirects";

export const dynamic = "force-dynamic";

/** The newest beta DMG, counted; stable when no beta is in the feed. */
export async function GET(request: Request): Promise<Response> {
  const { response, record } = await downloadRedirect(request, "beta");
  after(record);
  return response;
}
