# IsThatSlop.com

## What This Is

A community-driven database where users identify and evaluate whether content sources use AI-generated material. Users submit claims of AI usage with impact and confidence scores, and the platform algorithmically calculates a source's tier (Artisanal to Slop). Sources are organized hierarchically (Platform > Subreddit > User > Post) with scores propagating up the tree. Built with a Windows 95 aesthetic celebrating the human-driven internet era.

## Core Value

Users can find any content source, see community-verified AI usage claims with evidence, and trust the algorithmic scoring because it's based on transparent, disputable evidence — not opinion votes.

## Requirements

### Validated

- ✓ User can sign up with email/password and OAuth (Google, GitHub, Discord) — existing
- ✓ User sessions persist across browser refresh — existing
- ✓ User has profile with username and avatar — existing
- ✓ Sources organized in hierarchical tree (materialized path, max depth 5) — existing
- ✓ User can browse sources with breadcrumb navigation — existing
- ✓ User can create new sources with parent relationships — existing
- ✓ User can submit claims with description, impact (1-5), and confidence (1-5) — existing
- ✓ User can vote helpful/not helpful on claims — existing
- ✓ User can search sources by name (ILIKE) — existing
- ✓ Source pages display claims sorted by helpfulness — existing
- ✓ User profile pages show contribution history — existing
- ✓ Win95 themed UI components (buttons, inputs, windows, cards) — existing
- ✓ Homepage with search and source browsing — existing

### Active

- [ ] Email delivery via Resend (verification, password reset)
- [ ] Algorithmic tier calculation from claims (score cache with recalculation triggers)
- [ ] Database triggers for materialized path maintenance
- [ ] Comment system on claims (with dispute tagging)
- [ ] Claim edit/delete functionality
- [ ] Browse pages (recently added, hall of shame, most controversial, disputed)
- [ ] Reputation calculation logic
- [ ] Rate limiting on claims, votes, source creation
- [ ] Flag system for user content
- [ ] Basic moderation dashboard (view flags, approve/reject, action log)
- [ ] SEO basics (meta tags, sitemap, Open Graph)
- [ ] Error handling and user feedback (toast notifications, form errors)
- [ ] Reasonable mobile experience (responsive layout)
- [ ] Fix path column race condition on concurrent source creation
- [ ] Fix score cache staleness (add database triggers)

### Out of Scope

- File upload for evidence (Backblaze B2) — text + links sufficient for launch
- Official AI policy section — defer until core claims loop is proven
- Browser extension — separate milestone after web launch
- Full-text search (tsvector + GIN) — ILIKE sufficient for launch scale
- Background job queue — synchronous acceptable for launch scale
- Redis caching layer — direct DB queries acceptable for launch scale
- Advanced moderation (bulk ops, merge duplicates) — basic flag review sufficient
- User badges/achievements — defer to post-launch
- Email notifications (reply, tier changes) — defer to post-launch
- Public API — defer to post-launch
- 2FA — defer to post-launch
- Deployment/infrastructure setup (Dockploy, Hetzner) — separate concern

## Context

This is a brownfield project with significant existing code. The Turborepo monorepo has a working Next.js 16 app with React 19, Drizzle ORM on PostgreSQL, better-auth, and a Win95 themed component library. Core flows (auth, source CRUD, claim submission, voting, search) are functional but several critical pieces are missing for a production launch.

Key gaps identified by codebase audit:
- Email delivery is stubbed (console.log) — blocks real user signup verification
- Score calculation exists in `packages/scoring/` but database triggers to mark scores stale are missing
- Materialized path has race condition on concurrent source creation
- No rate limiting on any mutation endpoints
- No moderation UI despite flag schema existing
- Comment/dispute system not built yet
- Browse/discovery pages not built yet

The MVP specification at `docs/MVP.md` is comprehensive and covers the full vision. This milestone focuses on getting to a launchable state with the core loop working.

## Constraints

- **Budget**: $20/month operational cost — Hetzner CX33 + minimal services
- **Tech stack**: Next.js 16, React 19, Drizzle ORM, PostgreSQL, better-auth, Bun — all established
- **Runtime**: Bun 1.3.3 for package management and scripts
- **Aesthetic**: Windows 95 theme must be maintained across all new UI
- **Data model**: Claims-based scoring (not direct tier voting) — architectural decision already made
- **No API routes for internal data**: Use DAL pattern with Server Components and Server Actions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claims-based scoring over direct voting | Makes users investigators, creates audit trail, prevents gaming | ✓ Good |
| Materialized path over closure table | Max depth 5 makes recursive CTEs efficient, simpler maintenance | ✓ Good |
| Freeform text fields over enums | Extensible without migrations, let community define categories | — Pending |
| Resend for email delivery | Need transactional email for verification/reset, Resend is simple | — Pending |
| Text+links only for evidence (no file uploads) | Reduces scope, Backblaze B2 integration deferred | — Pending |
| Defer official AI policy section | Focus on community claims loop first, add policies when proven | — Pending |
| Defer browser extension | Separate milestone after web platform is stable | — Pending |

---
*Last updated: 2026-02-04 after initialization*
