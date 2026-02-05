# Codebase Concerns

**Analysis Date:** 2026-02-04

## Tech Debt

**Email Notification Stubs (Not Implemented):**
- Issue: Email verification and password reset use `console.log()` stubs instead of actual email delivery
- Files: `apps/web/app/lib/auth.ts` (lines 14-15, 20-21)
- Impact: Users cannot verify email addresses or reset forgotten passwords in production. Authentication workflow is broken for self-service password recovery.
- Fix approach: Integrate Resend email service or similar SMTP provider. Replace TODO comments with actual `sendVerificationEmail()` and `sendResetPassword()` implementations. Add environment variables for Resend API key. Include retry logic for failed sends.

**Missing Environment Variables Documentation:**
- Issue: OAuth provider credentials (Google, GitHub, Discord) are hardcoded to empty strings with no fallback or error handling
- Files: `apps/web/app/lib/auth.ts` (lines 26-37)
- Impact: Social auth will silently fail if env vars are missing. Users will see no error message, just broken OAuth buttons.
- Fix approach: Add validation in auth setup to check all required env vars exist. Throw error with helpful message listing missing variables. Document required env vars in `.env.example` with all OAuth providers.

**Untyped Database Error Handling:**
- Issue: `safeQuery()` wrapper in `apps/web/data/sources.ts` logs errors but catches all exceptions with fallback values, masking real database issues
- Files: `apps/web/data/sources.ts` (lines 21-33)
- Impact: Production errors may go unnoticed. Falling back to empty data structures hides connection issues, query bugs, or schema mismatches.
- Fix approach: Distinguish between retriable errors (connection timeouts) and fatal errors (schema issues). Use error tracking service (Sentry) instead of console.error. Return explicit error states instead of silent fallbacks. Add monitoring for error rates.

**Missing Rate Limiting Implementation:**
- Issue: No rate limiting on claim submission, voting, or source creation despite explicit comment acknowledging need
- Files: `apps/web/data/actions.ts` (lines 100-101)
- Impact: Spam attacks can flood database with fake claims. Users can artificially inflate vote counts. No protection against DOS-style abuse (thousands of rapid claims).
- Fix approach: Implement per-user/IP rate limiting on `submitClaim()`, `voteOnClaim()`, and `createSource()`. Use Redis (or Upstash) for distributed rate limiting. Add different limits per user reputation tier. Include rate limit headers in responses.

---

## Known Bugs

**Path Column Not Updated on Parent Change:**
- Issue: When creating a source with parent, path is set to "placeholder" and updated in separate query (lines 485, 509). Race condition possible if concurrent requests modify same source.
- Files: `apps/web/data/actions.ts` (lines 475-509)
- Trigger: Submit two source creation requests simultaneously with same parent
- Workaround: Serialize source creation requests (use database-level locking or background job queue)
- Fix approach: Use database transaction wrapping insert + update with explicit lock. Or use database trigger to auto-calculate path on insert.

**Score Cache Can Become Stale Without Trigger:**
- Issue: Database has `recalculation_requested_at` timestamp but schema shows no triggers defined to populate it
- Files: `packages/database/src/schema.ts` (line 178)
- Impact: Scores won't recalculate when claims are added/removed unless `updateSourceScoreCache()` is explicitly called. Manual edits to claims table bypass this.
- Fix approach: Add database triggers (as documented in MVP.md lines 873-877) to mark scores stale. Implement background worker to process stale scores.

---

## Security Considerations

**Hardcoded Test Secret in .env:**
- Risk: BETTER_AUTH_SECRET in checked-in `.env` file is visible in git history
- Files: `/Users/carles/isthatslop/.env` (line 4)
- Current mitigation: File marked in `.gitignore` but secret already exposed in git
- Recommendations:
  - Rotate BETTER_AUTH_SECRET immediately in production
  - Add `.env` to `.gitignore` permanently (verify it's there)
  - Use `.env.example` with placeholder values only
  - Implement git-crypt or sealed-secrets for dev secret rotation
  - Document that all prod secrets must come from environment variables, not files

**Validation Trusts User Input Implicitly:**
- Risk: Validation functions in `apps/web/lib/validation.ts` accept untrimmed input. Length checks on raw strings could be bypassed with whitespace padding.
- Files: `apps/web/lib/validation.ts`
- Current mitigation: Server actions trim input before storage (e.g., `.trim()` in actions.ts line 480)
- Recommendations:
  - Add `.trim()` inside validation functions themselves
  - Validate against Unicode abuse (zero-width characters, RTL override)
  - Add tests for validation edge cases (emoji, special chars, null bytes)

**No SQL Injection Protection in Search (But Using Drizzle):**
- Risk: Search uses parametrized query but ILIKE pattern is user-controlled string
- Files: `apps/web/data/actions.ts` (line 562)
- Current mitigation: Drizzle ORM uses prepared statements. Pattern is wrapped with `%` but user input is not escaped.
- Recommendations:
  - Verify Drizzle escapes ILIKE patterns (it should via parameterization)
  - Add integration tests confirming malicious strings don't break search
  - Consider limiting search query length (currently unlimited)

**Missing CSRF Protection on Server Actions:**
- Risk: Server actions in Next.js 16 should have CSRF protection but none explicitly configured
- Files: `apps/web/data/actions.ts` (all mutation functions)
- Current mitigation: Next.js handles CSRF automatically for server actions
- Recommendations:
  - Document that CSRF is handled by framework (add comment to top of file)
  - Verify in production that X-CSRF-Token headers are validated
  - Test CSRF protection with integration tests

---

## Performance Bottlenecks

**No Pagination on Claim Comments:**
- Problem: All claim comments loaded without limit, could be thousands for controversial claims
- Files: `apps/web/data/sources.ts` (implied from schema but not shown)
- Cause: Comment query likely fetches all records for a claim
- Improvement path: Add pagination (limit/offset) to comment queries. Lazy-load comments on scroll. Cache recent comments separately.

**Recursive Source Child Queries Unoptimized:**
- Problem: `getSourceChildrenDTO()` (imported in actions.ts line 14) likely uses recursive CTE without indexes on (parent_id, depth)
- Files: `apps/web/data/sources.ts` (line 35 calls unshown function)
- Cause: Depth-based hierarchy queries require multiple index lookups
- Improvement path: Verify indexes exist on sources(parent_id) and sources(depth). Add partial index for active sources (deleted_at IS NULL). Profile queries with EXPLAIN ANALYZE.

**Score Calculation Runs Synchronously on Every Claim:**
- Problem: `updateSourceScoreCache()` called immediately after claim insert, blocking response
- Files: `apps/web/data/actions.ts` (line 121)
- Cause: No background job queue, calculation must complete before response sent to user
- Improvement path: Move to background job (Bull queue, Inngest, or cron). Return immediate response to client. Recalculate scores asynchronously with debouncing (every 5 minutes). Update UI optimistically.

**No Query Result Caching for Source Details:**
- Problem: Every page load queries full source hierarchy, user info, claims, votes, comments from database
- Files: `apps/web/app/sources/[...slug]/page.tsx` (likely makes multiple DAL calls)
- Cause: React's `cache()` only works within single request, not across requests
- Improvement path: Add Redis cache layer for source DTOs (TTL 1 hour). Invalidate on claim/vote changes. Use Revalidate-Tag header for ISR invalidation.

---

## Fragile Areas

**Materialized Path String Parsing is Brittle:**
- Files: `apps/web/data/sources.ts` (breadcrumb parsing logic), `packages/database/src/schema.ts` (path column used throughout)
- Why fragile: Path format "uuid1.uuid2.uuid3" is fragile. Any bug storing path (missing dot, wrong order) silently breaks hierarchy. UUID parsing via string split is error-prone.
- Safe modification:
  - Always parse path with database functions (`string_to_array(path, '.')::uuid[]`) not application code
  - Add unit tests for path generation (parent path + new ID = child path)
  - Add data integrity check on boot to detect malformed paths
  - Consider storing path as array column instead of string (PostgreSQL `uuid[]` type)
- Test coverage: Need tests for:
  - Path generation on source creation
  - Path updates when parent changes
  - Breadcrumb extraction from path
  - Deep nesting (5 levels) path parsing

**Score Tier Threshold Mapping is Hardcoded:**
- Files: `packages/scoring/src/index.ts` (lines 4-10)
- Why fragile: Thresholds hardcoded as magic numbers. Changing thresholds requires code change + deploy. No migration path if algorithm needs tuning based on real data.
- Safe modification:
  - Move thresholds to database table or environment variables
  - Add configuration management system for tuning (with audit log)
  - Create feature flags for threshold experiments (A/B testing)
  - Add monitoring for score distribution to detect threshold misalignment
- Test coverage: Need tests for:
  - Each tier boundary (claims just below/above threshold)
  - Normalized score calculation with various claim counts
  - Edge cases (0 claims, 1000 claims)

**Vote Count Arithmetic in Concurrent Requests:**
- Files: `apps/web/data/actions.ts` (lines 248-265, 277-287)
- Why fragile: Uses `sql` expressions to increment/decrement vote counts (`${claims.helpfulVotes} + 1`). If two concurrent requests vote simultaneously, counts can be inconsistent.
- Safe modification:
  - Use database-level transactions with explicit locking (`SELECT ... FOR UPDATE`)
  - Or use atomic increment operators (PostgreSQL `UPDATE ... SET col = col + 1` is atomic)
  - Verify Drizzle generates atomic SQL for SQL expressions
  - Add integration test with concurrent vote submissions
- Test coverage: Need tests for:
  - Concurrent vote operations (verify final count is correct)
  - Vote changes (helpful → not helpful) with concurrent votes
  - Race conditions between vote insert and claim update

**UUID Validation Uses Regex Instead of Database:**
- Files: `apps/web/lib/validation.ts` (lines 9-15)
- Why fragile: Regex-based UUID validation can have false positives/negatives. Real validation should be database constraint.
- Safe modification:
  - Trust database UUID type for validation (PostgreSQL enforces format)
  - Replace regex with optional human-readable validation message
  - Catch database constraint violations and map to user-friendly errors
  - Add UUID v4 specificity if needed (random vs. time-based)
- Test coverage: Need tests for:
  - Valid UUIDs (v4 format)
  - Invalid UUIDs (wrong length, bad characters)
  - SQL injection attempts in UUID fields

---

## Scaling Limits

**Single PostgreSQL Instance Without Read Replicas:**
- Current capacity: ~100 concurrent connections (Drizzle default pool of 20, but limit depends on schema)
- Limit: Horizontal scaling impossible without read replicas. Write operations will bottleneck at single database.
- Scaling path:
  - Add PostgreSQL read replica on Hetzner
  - Use pg-router or application-level routing to direct reads to replica
  - Monitor replication lag
  - For extreme scale: Consider Citus or TimescaleDB for distributed processing

**No Caching Layer Between App and Database:**
- Current capacity: Every request hits database. No in-memory cache.
- Limit: Database queries will become bottleneck before CPU. Score calculation queries hit database on every claim.
- Scaling path: Add Redis cache layer. Cache source DTOs, score calculations, search results. Implement cache invalidation on mutations.

**Score Recalculation Blocks on Large Claim Sets:**
- Current capacity: Recalculation queries all claims, calculates score in-process, then updates cache. For sources with 10,000+ claims, this could take seconds.
- Limit: Any claim-heavy operation becomes slow at scale. UI becomes unresponsive.
- Scaling path:
  - Move calculation to background job with debouncing
  - Use PostgreSQL generated columns to pre-compute score values
  - Implement hierarchical aggregation (score cache only stores for leaf nodes, parent scores computed from children)

**No Full-Text Search Index:**
- Current capacity: MVP uses ILIKE string search (table scan). Works for <100k sources.
- Limit: Search response times degrade linearly with source count. Complex queries timeout.
- Scaling path: MVP mentions PostgreSQL tsvector + GIN indexes but they're not implemented. Add search_vector column and trigger to maintain it.

---

## Dependencies at Risk

**better-auth Latest Major Version (1.4.17):**
- Risk: better-auth is actively developed but still pre-1.0. API breaking changes possible.
- Impact: If better-auth releases v2 with breaking changes, authentication layer needs rewrite.
- Migration plan:
  - Monitor releases for breaking changes
  - Pin to minor version (^1.4.0 not ^1)
  - Keep comprehensive auth tests so breaking changes are caught early
  - Consider alternative (clerk, next-auth) if better-auth abandonment risk rises

**Drizzle ORM 0.45.1 (Pre-1.0):**
- Risk: Pre-release version. Schema changes or query generation bugs possible.
- Impact: Migration could require schema rewrites if ORM changes how it generates SQL.
- Migration plan:
  - Same as better-auth: pin minor version
  - Test database queries with EXPLAIN ANALYZE to catch performance regressions
  - Backup before upgrading versions

**PostgreSQL 16 (Newest):**
- Risk: Newer versions may not be immediately available on managed database services.
- Impact: Hetzner PostgreSQL upgrades may lag. Feature gap over time.
- Migration plan: Stay on PostgreSQL 15 for stability (widely supported). Upgrade major versions annually.

---

## Missing Critical Features

**No Email Delivery Service:**
- Problem: Email verification and password reset are stubbed with console.log
- Blocks: Users cannot sign up (email verification blocked) or recover accounts
- Solution urgency: **CRITICAL for MVP launch**
- Required before production: Integrate Resend, SendGrid, or Mailgun

**No File Upload Service:**
- Problem: MVP specification mentions "up to 3 files" for evidence but Backblaze B2 integration not implemented
- Blocks: Claims cannot include evidence uploads (image stubs instead)
- Solution urgency: **HIGH for MVP**
- Required before public launch: Add Backblaze B2 client and upload handlers

**No Rate Limiting Implementation:**
- Problem: Services (claims, votes, source creation) unprotected from spam
- Blocks: Cannot prevent abuse at scale
- Solution urgency: **MEDIUM (can ship with basic limits)**
- Required before public launch: Upstash Redis + middleware for rate limiting

**No Moderation Dashboard:**
- Problem: Flag system in schema but no admin UI to view/resolve flags
- Blocks: Cannot moderate user-generated content
- Solution urgency: **MEDIUM (launch with manual moderation)**
- Required before scaling: Build flag review page and moderation actions

**No Background Job Queue:**
- Problem: Score recalculation synchronous, email sending synchronous
- Blocks: Slow operations block user responses
- Solution urgency: **LOW for MVP (can be optimized later)**
- Required before scaling: Bull, Inngest, or Temporal queue

---

## Test Coverage Gaps

**No Tests for Materialized Path Logic:**
- What's not tested: Path generation on source creation with multiple hierarchy levels. Path updates when parent changes. Path parsing for breadcrumbs.
- Files: `apps/web/data/sources.ts`, `packages/database/src/schema.ts`
- Risk: Path bugs silently break hierarchy. Only discovered when user notices broken breadcrumbs.
- Priority: **HIGH** - hierarchy is core feature

**No Tests for Score Calculation Edge Cases:**
- What's not tested: Score calculation with 0 claims (should be tier 0). Threshold boundaries (claim weight exactly at threshold). Very high claim counts (normalized score underflow). Negative helpful votes (impossible in schema but edge case).
- Files: `packages/scoring/src/index.ts`
- Risk: Score tier misclassification. Hard to debug without tests.
- Priority: **HIGH** - scoring is core algorithm

**No Concurrent Request Tests:**
- What's not tested: Two users voting on same claim simultaneously. Two users creating claims for same source simultaneously. Race conditions in vote count updates.
- Files: `apps/web/data/actions.ts`
- Risk: Silent data corruption under concurrent load. Inconsistent vote counts.
- Priority: **MEDIUM** - will manifest in production with real users

**No Database Transaction Tests:**
- What's not tested: Transactional integrity of claim + score update. What happens if score update fails after claim insert.
- Files: `apps/web/data/actions.ts`
- Risk: Orphaned claims without scores. Inconsistent database state.
- Priority: **MEDIUM** - affects data consistency

**No Authentication Flow Tests:**
- What's not tested: Sign up flow end-to-end (would require email stub). OAuth callback handling. Session management. Permission checks (can user vote on claim?).
- Files: `apps/web/app/lib/auth.ts`, `apps/web/data/actions.ts`
- Risk: Authentication bugs discovered in production (user can vote unsigned, sessions expire incorrectly).
- Priority: **HIGH** - security critical

**No Validation Tests:**
- What's not tested: Input validation edge cases. Unicode abuse (zero-width chars, RTL override). SQL injection attempts. Very long strings.
- Files: `apps/web/lib/validation.ts`
- Risk: Validation bypass. Injection attacks or display bugs.
- Priority: **MEDIUM** - security adjacent

---

## Summary of Critical Issues

**Before MVP Launch:**
1. Implement email service integration (currently stubs)
2. Implement rate limiting (completely missing)
3. Add missing database triggers for path/score maintenance
4. Add high-coverage tests for scoring algorithm and hierarchy logic

**Before Public Scaling:**
1. Implement background job queue for async operations
2. Add caching layer (Redis) for score/source data
3. Implement file upload service (Backblaze B2)
4. Add moderation dashboard
5. Implement concurrent request test suite
6. Add database read replicas for scaling

**Post-Launch Optimization:**
1. Monitor and optimize score calculation queries
2. Add full-text search index (tsvector)
3. Implement hierarchical score aggregation
4. Add observability/monitoring (Sentry, UptimeRobot)

---

*Concerns audit: 2026-02-04*
