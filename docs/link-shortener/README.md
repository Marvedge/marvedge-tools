# Link Shortener

Task T-00033 / T-00034 / T-00035 — Supabase-backed link shortener at `/link-shortener`.
Short links are served from `/go/[code]` as real HTTP 302 redirects.

For the full design, API contract, and verification checklist, see:

- [`DESIGN.md`](./DESIGN.md)
- [`openapi.yaml`](./openapi.yaml)
- [`VERIFY.md`](./VERIFY.md)

## Environment setup

Copy `.env.example` to `.env.local` and fill in the required values.
**Never commit `.env.local`.**

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only) |
| `ADMIN_API_KEY` | ✅ | Secret key for `/api/admin/links/*` endpoints |
| `IP_HASH_SALT` | ✅ | Salt for IP hashing — raw IPs are never stored |
| `PUBLIC_SITE_URL` | ✅ | Canonical public URL, no trailing slash |
| `REPORTING_SESSION_SECRET` | optional | Cookie signing secret; derived from salt if omitted |
| `BLOCK_SHORTENER_CHAINS` | optional | Set `"true"` to block chained shorteners |

## Database migrations

Apply migrations in order using the Supabase CLI or SQL editor:

```bash
# 1. Create the short_links table
supabase db execute --file supabase/migrations/202611260001_create_short_links.sql

# 2. Add RLS policies, indexes, and security hardening
supabase db execute --file supabase/migrations/202611260002_harden_short_links.sql
```

> **Important:** Always apply migrations before deploying a new version.

## Running tests

```bash
# Backend service tests (Node environment — no browser APIs)
pnpm test:links

# Frontend & UI helper tests (jsdom environment)
pnpm test

# TypeScript check
pnpm typecheck
```

Expected results:

- `pnpm test:links` → 11 test files, 112 tests
- `pnpm test` → 10 test files, 68 tests (includes `links-ui-helpers.test.ts`)

## Admin API

Protected by the `ADMIN_API_KEY` header (`x-admin-key`):

```bash
# List reports awaiting review
curl -H "x-admin-key: $ADMIN_API_KEY" https://your-domain.com/api/admin/links/reports

# Update link status (approve / block)
curl -X PATCH -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"abc123","status":"active"}' \
  https://your-domain.com/api/admin/links/status

# Add a domain to the blocklist
curl -X POST -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain":"malicious.example.com"}' \
  https://your-domain.com/api/admin/links/blocked-domains
```

For more curl examples and DB security checks, see [`VERIFY.md`](./VERIFY.md).

## Creator token behaviour

- When a user creates a short link, the server returns a one-time `creatorToken`.
- The token is stored in `localStorage` under the key `mrv_creator_links` and displayed to the user.
- The user **must save this token** — there is no account system and lost tokens cannot be recovered.
- The token is never sent to the server again after creation; the server verifies it by comparing a stored hash.
- Security tradeoff: the token persists in `localStorage` and is vulnerable to XSS. CSP hardening is tracked under T-00036.

## Security controls

| Control | Implementation |
|---|---|
| URL allowlist | Only `http://` and `https://` schemes; max 2 048 chars |
| Self-redirect block | Rejects links pointing to `PUBLIC_SITE_URL` |
| Reserved slug block | ~40 reserved paths (api, admin, go, etc.) |
| IP-based rate limiting | Fixed-window in Supabase; raw IPs hashed with `IP_HASH_SALT` |
| Domain blocklist | Admin-managed list checked at redirect time |
| Origin check on POST | Rejects cross-origin form submissions |
| Password protection | bcrypt-hashed, brute-force limited per link |
| Pending-review interstitial | Warns visitors before redirecting to unreviewed links |
| Admin moderation | Approve / block / soft-delete via admin API |

## T-00036 release blockers (not yet implemented)

The following items are required before the feature is considered safe for general public release:

- [ ] Rate-limit cleanup scheduler (pg_cron job or Netlify scheduled function to prune `rate_limit_counters`)
- [ ] `/terms` and `/abuse-policy` pages (linked from redirect interstitials)
- [ ] CSP headers on inline HTML pages in `app/go/[code]/route.ts`
- [ ] Blocklist feed automation (admin-managed; currently manual only)

## Deployment checklist

1. Set all required environment variables in your hosting provider.
2. Apply both SQL migrations before the first request hits `/go/[code]`.
3. Verify `PUBLIC_SITE_URL` matches the deployed domain exactly (no trailing slash).
4. Test a redirect end-to-end: `curl -I https://your-domain.com/go/test-code`

## Rollback

The migrations are additive (new tables only). To roll back:

```sql
-- Drop in reverse order
DROP TABLE IF EXISTS public.short_links CASCADE;
DROP TABLE IF EXISTS public.blocked_domains CASCADE;
DROP TABLE IF EXISTS public.rate_limit_counters CASCADE;
DROP TABLE IF EXISTS public.link_reports CASCADE;
```

> This permanently deletes all shortened links and report data.

## Differences from the TanStack Start reference implementation

| Aspect | Original (`Final_tools_Marv`) | This repo (`marvedge-tools`) |
|---|---|---|
| Server functions | `createServerFn` from `@tanstack/start` | Next.js `"use server"` actions in `src/lib/links.functions.ts` |
| Redirect route | Loader `throw redirect(302, url)` | `app/go/[code]/route.ts` Next.js route handler |
| Request reconstruction | Native SSR request object | `import("next/headers")` wrapped in try/catch |
| Framework | TanStack Start + Vite | Next.js 16 App Router |
| DB migrations | Drizzle (`drizzle/migrations/`) | Raw SQL (`supabase/migrations/`) |
