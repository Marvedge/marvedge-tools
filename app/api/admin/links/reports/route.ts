import { listReportsService, updateReportService } from "@/lib/links/admin.server";

export async function GET(request: Request): Promise<Response> {
  return listReportsService(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return updateReportService(request);
}
