# Link Shortener — Verification Checklist

**Branch:** `feat/t-00034-link-shortener-backend` (backend) / `feat/t-00035-link-shortener-frontend` (frontend)
**Last updated:** 2026-11-26

This document records the manual and automated verification steps required before merging the Link Shortener PRs.

---

## 1. Environment Setup

```bash
# Copy and fill in secrets
cp .env.example .env.local

# Install dependencies
pnpm install

# Apply database migrations (run against your Supabase project via psql or Supabase CLI)
# Step 1 — base table (idempotent):
#   supabase/migrations/202611260001_create_short_links.sql
# Step 2 — harden + new tables + stored procedures:
#   supabase/migrations/202611260002_harden_short_links.sql
```

> [!IMPORTANT]
> Run migrations in order. Both are idempotent (use `IF NOT EXISTS`, `CREATE OR REPLACE`).
> Do NOT run destructive SQL against production databases.

---

## 2. Automated Tests

```bash
# Backend service tests (Node environment, no browser globals)
pnpm test:links

# UI helper tests (jsdom environment)
pnpm test -- --testPathPattern="links-ui-helpers"

# TypeScript check
pnpm typecheck

# Lint
pnpm lint

# Production build check
pnpm build
```

---

## 3. Backend Verification (Automated — `pnpm test:links`)

| Test File | Coverage |
|---|---|
| `links-url-policy.test.ts` | HTTPS-only, private IP rejection, self-redirect, Punycode flag |
| `links-reserved.test.ts` | All tool slugs, system paths, brand impersonation |
| `links-slug.test.ts` | Base62 generation, collision retry, format validation |
| `links-password.test.ts` | PBKDF2 hash, verify, legacy upgrade, constant-time comparison |
| `links-token.test.ts` | CSPRNG generation, SHA-256 storage, constant-time verify |
| `links-blocklist.test.ts` | Exact + suffix domain matching |
| `links-ip.test.ts` | Netlify header trust, XFF fallback in dev, session cookie |
| `links-ratelimit.test.ts` | All limit configurations, fail-open/closed behavior |
| `links-redirect.test.ts` | Full decision matrix, origin validation |
| `links-service.test.ts` | Create, resolve, getLinkInfo, updateLink, reportLink |
| `links-admin.test.ts` | Auth, rate limit, reports CRUD, status updates, blocklist |

---

## 4. HTTP Verification (Manual — dev server required)

Start the dev server: `pnpm dev`

### 4.1 Redirect Behavior

```bash
# 302 for active link
curl -v http://localhost:3000/go/TEST_CODE 2>&1 | grep -E "HTTP|Location"

# 404 for missing link
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/go/does-not-exist

# 410 for expired link
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/go/EXPIRED_CODE

# Password form (200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/go/PASSWORD_CODE

# Rate limit (429) — hammer the endpoint
for i in $(seq 1 130); do curl -s -o /dev/null http://localhost:3000/go/TEST_CODE; done
```

### 4.2 Security Headers

```bash
curl -sI http://localhost:3000/go/TEST_CODE | grep -E "Cache-Control|Referrer-Policy|X-Robots"
# Expected:
#   Cache-Control: no-store
#   Referrer-Policy: no-referrer
#   X-Robots-Tag: noindex
```

### 4.3 Password POST

```bash
# Correct password → 302
curl -v -X POST http://localhost:3000/go/PW_CODE \
  -H "Origin: http://localhost:3000" \
  -d "action=unlock&password=correct"

# Wrong password → 401
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/go/PW_CODE \
  -H "Origin: http://localhost:3000" \
  -d "action=unlock&password=wrong"

# Cross-origin POST → 403
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/go/TEST_CODE \
  -H "Origin: https://evil.example.com" \
  -d "action=continue"
```

### 4.4 Admin API

```bash
# List reports (requires ADMIN_API_KEY)
curl -s -H "x-admin-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/api/admin/links/reports | jq .

# Update link status
curl -s -X POST http://localhost:3000/api/admin/links/status \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{"code":"TEST_CODE","status":"blocked"}' | jq .

# Add blocked domain
curl -s -X POST http://localhost:3000/api/admin/links/blocked-domains \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{"domain":"malicious.example.com"}' | jq .

# Unauthorized → 401
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-admin-api-key: wrong-key" \
  http://localhost:3000/api/admin/links/reports

# Unconfigured → 500
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/admin/links/reports
```

---

## 5. Database Security Verification

Run directly against your Supabase SQL editor (or psql):

```sql
-- Verify anon role CANNOT call rate_limit_hit
SET ROLE anon;
SELECT * FROM public.rate_limit_hit('test', 60, 10);
-- Expected: ERROR: permission denied

-- Verify service_role CAN call it (run as postgres/service_role)
SELECT * FROM public.rate_limit_hit('test', 60, 10);
-- Expected: row with allowed, remaining, retry_after

-- Verify existing links survived migration
SELECT code, status, creator_token_hash IS NOT NULL AS has_token
FROM public.short_links
ORDER BY created_at
LIMIT 10;

-- Verify new tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('link_reports', 'blocked_domains', 'rate_limits');
```

---

## 6. Frontend Verification (Manual)

| Scenario | Expected |
|---|---|
| Enter URL and click Shorten Now | Short link appears, creator token notice shown |
| Copy URL button | URL copied to clipboard |
| Copy Key button in notice | Token copied |
| Dismiss notice, reload page | "Manage Your Short Links" section shows the link |
| Refresh stats button | Click count and status update |
| Disable Link button | Status changes to Disabled |
| Enable Link button | Status changes to Active |
| Edit Expiry → save | Expiry timestamp updates |
| Set/Remove password | Password status updates |
| Import Link Key panel | Paste code + token → link appears in manager |
| Forget link | Link removed from list (not deleted from DB) |
| Enter blocked domain URL | Error: blocked_domain |
| Enter reserved slug | Error: reserved |
| QR toggle | QR code appears, Download PNG works |
| Mobile viewport | Layout is responsive, no overflow |

---

## 7. Release Blockers (T-00036)

The following T-00036 items are **implemented** in T-00034/T-00035:

- ✅ URL safety validation (private IP, scheme, credentials, self-redirect)
- ✅ Blocked domain checks at creation + redirect time (FR-11)
- ✅ Reporting flow with deduplication (unique constraint on `code, reporter_hash`)
- ✅ Automatic `pending_review` escalation at ≥3 distinct verified reporters (FR-09)
- ✅ Admin moderation (reports, status, blocked domains)
- ✅ Rate limiting (all 7 categories per DESIGN.md §10)
- ✅ Structured audit logs (`console.info` JSON events)
- ✅ Security headers on all redirect responses
- ✅ Cross-origin POST protection (Origin + Sec-Fetch-Site validation)

The following items are **NOT implemented** in T-00034/T-00035 and are explicit **release blockers** before production launch:

| Blocker | Description | Required in |
|---|---|---|
| ❌ Written Abuse Policy | A public `/terms` or `/abuse-policy` page linked from the tool | T-00036 |
| ❌ Rate-limit cleanup scheduler | `cleanup_rate_limits()` RPC needs a periodic trigger | T-00036 (ops) |
| ❌ CSP headers | Content-Security-Policy not yet set for the redirect HTML forms | T-00036 |
| ❌ Automated blocklist feed | Integration with external URL reputation APIs | T-00036 (optional v2) |

> [!CAUTION]
> Do not launch the link shortener feature publicly without resolving the release blockers above.
> The rate_limits table will grow unbounded without the cleanup scheduler.

---

## 8. Rate-Limit Cleanup — Scheduler Recommendation

The `public.cleanup_rate_limits()` RPC prunes records older than 2 hours.

**Option A — Supabase pg_cron** (recommended if available):
```sql
-- Enable pg_cron extension in Supabase dashboard
SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$
  SELECT public.cleanup_rate_limits();
$$);
```
Pros: runs inside the database, no external service needed.
Cons: pg_cron is not available on all Supabase plans (Pro+ required).

**Option B — Scheduled Edge Function** (Netlify/Vercel cron):
```js
// netlify/functions/cleanup-rate-limits.mts (scheduled)
export default async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await db.rpc("cleanup_rate_limits");
};
```
Configure in `netlify.toml`:
```toml
[functions."cleanup-rate-limits"]
  schedule = "0 * * * *"
```
Pros: works on all Supabase plans.
Cons: requires a separate function deployment.

**Decision:** Confirm deployment platform (Netlify Functions vs Vercel Cron vs Supabase pg_cron) before implementing. Do not introduce a scheduler without approval.
