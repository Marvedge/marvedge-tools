"use server";

/**
 * Next.js Server Actions for the Link Shortener.
 * DESIGN.md §7.1 — Public & Creator functions.
 *
 * These replace TanStack Start createServerFn with Next.js "use server" actions.
 * The call signatures ({ data: { ... } }) intentionally mirror the original
 * TanStack implementation so that existing UI code (LinkShortener.tsx,
 * CreatorLinkManager.tsx) can be reused without modification.
 *
 * All business logic lives in src/lib/links/service.server.ts (server-only).
 * This file contains only the thin Next.js action wrappers + Zod validation.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const createShortLinkSchema = z.object({
  url: z.string().max(2048),
  code: z
    .string()
    .regex(/^[A-Za-z0-9_-]{3,40}$/, "3–40 letters, numbers, - or _")
    .optional(),
  password: z.string().min(4).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

const resolveShortLinkSchema = z.object({
  code: z.string().max(40),
  password: z.string().max(100).optional(),
});

const getLinkInfoSchema = z.object({
  code: z.string().max(40),
  creatorToken: z.string().max(100),
});

const updateLinkSchema = z.object({
  code: z.string().max(40),
  creatorToken: z.string().max(100),
  status: z.enum(["active", "disabled"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  password: z.string().min(4).max(100).nullable().optional(),
});

const disableLinkSchema = z.object({
  code: z.string().max(40),
  creatorToken: z.string().max(100),
});

const reportLinkSchema = z.object({
  code: z.string().max(40),
  reason: z.enum(["phishing", "malware", "spam", "illegal", "other"]),
  details: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Re-exported types for client consumption
// ---------------------------------------------------------------------------

export type CreateShortLinkResult =
  | { ok: true; code: string; creatorToken: string }
  | {
      ok: false;
      error:
        | "taken"
        | "reserved"
        | "invalid_url"
        | "blocked_domain"
        | "rate_limited"
        | "server_error";
      retryAfter?: number;
    };

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new short link.
 * Returns { ok: true, code, creatorToken } on success.
 * Creator token is shown exactly once — the caller must save it.
 */
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
  const parsed = createShortLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "invalid_url" };
  }

  const { createShortLinkService } = await import("./links/service.server");
  return createShortLinkService(parsed.data);
}

/**
 * Resolves a short link.
 * Returns URL for active links, or a typed status for all other states.
 * Used internally by go/[code]/route.ts and by the UI's preview flow.
 */
export async function resolveShortLink({
  data,
}: {
  data: { code: string; password?: string };
}) {
  const parsed = resolveShortLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { status: "missing" as const };
  }

  const { resolveShortLinkService } = await import("./links/service.server");
  return resolveShortLinkService(parsed.data);
}

/**
 * Returns current link information for an authenticated creator.
 * Requires a valid creator token.
 */
export async function getLinkInfo({
  data,
}: {
  data: { code: string; creatorToken: string };
}) {
  const parsed = getLinkInfoSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: "not_found" as const };
  }

  const { getLinkInfoService } = await import("./links/service.server");
  return getLinkInfoService(parsed.data);
}

/**
 * Updates a link's status, expiry, or password.
 * Creators cannot override moderation states (blocked, pending_review).
 */
export async function updateLink({
  data,
}: {
  data: {
    code: string;
    creatorToken: string;
    status?: "active" | "disabled";
    expiresAt?: string | null;
    password?: string | null;
  };
}) {
  const parsed = updateLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: "invalid_request" as const };
  }

  const { updateLinkService } = await import("./links/service.server");
  return updateLinkService(parsed.data);
}

/**
 * Convenience wrapper — disables a link by creator token.
 */
export async function disableLink({
  data,
}: {
  data: { code: string; creatorToken: string };
}) {
  const parsed = disableLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: "not_found" as const };
  }

  const { disableLinkService } = await import("./links/service.server");
  return disableLinkService(parsed.data);
}

/**
 * Submits an abuse report for a short link.
 * Rate-limited per verified IP or signed session cookie.
 * Unverified reports do not count toward auto-escalation threshold.
 */
export async function reportLink({
  data,
}: {
  data: {
    code: string;
    reason: "phishing" | "malware" | "spam" | "illegal" | "other";
    details?: string;
  };
}) {
  const parsed = reportLinkSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, error: "link_not_found" as const };
  }

  const { reportLinkService } = await import("./links/service.server");
  return reportLinkService(parsed.data);
}
