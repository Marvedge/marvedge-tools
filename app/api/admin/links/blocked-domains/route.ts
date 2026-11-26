import {
  addBlockedDomainService,
  listBlockedDomainsService,
  removeBlockedDomainService,
} from "@/lib/links/admin.server";

export async function GET(request: Request): Promise<Response> {
  return listBlockedDomainsService(request);
}

export async function POST(request: Request): Promise<Response> {
  return addBlockedDomainService(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return removeBlockedDomainService(request);
}
