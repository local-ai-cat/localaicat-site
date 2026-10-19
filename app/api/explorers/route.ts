import { handleExplorerRequest } from "../../../lib/explorer-presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request): Promise<Response> {
  return handleExplorerRequest(request);
}
