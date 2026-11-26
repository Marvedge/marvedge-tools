import { updateLinkStatusService } from "@/lib/links/admin.server";

export async function POST(request: Request): Promise<Response> {
  return updateLinkStatusService(request);
}
