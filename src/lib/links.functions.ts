"use server";

export type CreateShortLinkResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

export async function createShortLink({
  data,
}: {
  data: {
    url: string;
    code?: string;
    password?: string;
    expiresAt?: string;
  };
}): Promise<CreateShortLinkResult> {
  const code = data.code || Math.random().toString(36).slice(2, 9);
  return { ok: true, code };
}

export async function resolveShortLink({
  data,
}: {
  data: { code: string; password?: string };
}) {
  return { status: "ok" as const, url: "/" };
}
