import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  integer,
  numeric,
  primaryKey,
  uniqueIndex,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// =============================================================================
// USER & AUTH TABLES (better-auth compatible)
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Username plugin fields
  username: text("username").unique(), // Normalized (lowercase) username
  displayUsername: text("display_username").unique(), // Original casing username
  // Application-specific fields
  avatarUrl: text("avatar_url"),
  reputation: integer("reputation").default(0).notNull(),
  role: text("role").default("member").notNull(), // "member", "moderator", "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// SOURCES TABLE (Hierarchical with Materialized Path)
// =============================================================================

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(), // URL-friendly identifier, unique within parent
    name: text("name").notNull(),
    type: text("type"), // Freeform: "platform", "subreddit", "blog", "youtube-channel", etc.
    description: text("description"),
    url: text("url"), // Canonical URL for this source
    parentId: uuid("parent_id").references((): AnyPgColumn => sources.id, {
      onDelete: "set null",
    }),
    path: text("path").notNull(), // Materialized path: "uuid1.uuid2.uuid3"
    depth: integer("depth").default(0).notNull(), // 0 = root, max 5
    // Official AI policy fields
    officialAiPolicy: text("official_ai_policy"), // Official AI usage policy text
    officialAiPolicyUrl: text("official_ai_policy_url"), // Link to policy source
    officialAiPolicyUpdatedAt: timestamp("official_ai_policy_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    deletedAt: timestamp("deleted_at"), // Soft delete for audit trail
    // Note: search_vector would be added via raw SQL migration for full-text search
  },
  (table) => [
    uniqueIndex("sources_parent_slug_idx").on(table.parentId, table.slug),
    index("sources_parent_idx").on(table.parentId),
    index("sources_depth_idx").on(table.depth),
    index("sources_active_idx")
      .on(table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    check("sources_max_depth", sql`${table.depth} <= 5`),
  ],
);

// =============================================================================
// SOURCE PATHS TABLE (Multi-path junction for hierarchy)
// =============================================================================

export const sourcePaths = pgTable(
  "source_paths",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    ancestorId: uuid("ancestor_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    path: text("path").notNull(), // Materialized path ending at this source: "uuid1.uuid2.uuid3"
    pathType: text("path_type").notNull().default("primary"), // "primary", "subreddit", "user", "category", etc.
    depth: integer("depth").notNull(), // Depth from root in this particular path
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("source_paths_source_idx").on(table.sourceId),
    index("source_paths_ancestor_idx").on(table.ancestorId),
    index("source_paths_path_idx").on(table.path),
    uniqueIndex("source_paths_source_path_uniq").on(table.sourceId, table.path),
  ],
);

// =============================================================================
// SOURCE SCORE CACHE TABLE
// =============================================================================

export const sourceScoreCache = pgTable(
  "source_score_cache",
  {
    sourceId: uuid("source_id")
      .primaryKey()
      .references(() => sources.id, { onDelete: "cascade" }),
    tier: integer("tier"), // 0-4 scale (calculated from claims)
    rawScore: numeric("raw_score", { precision: 10, scale: 2 }), // Sum of claim weights
    normalizedScore: numeric("normalized_score", { precision: 10, scale: 2 }), // Score after normalization
    claimCount: integer("claim_count").default(0).notNull(),
    lastCalculatedAt: timestamp("last_calculated_at"),
    recalculationRequestedAt: timestamp("recalculation_requested_at"),
  },
  (table) => [index("source_score_cache_tier_idx").on(table.tier)],
);

// =============================================================================
// CLAIMS TABLE (Users submit claims of AI usage with impact and confidence)
// =============================================================================

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(), // Description of AI usage found (100-2000 chars)
    impact: integer("impact").notNull(), // 1-5 scale: Cosmetic to Pervasive
    confidence: integer("confidence").notNull(), // 1-5 scale: Speculative to Confirmed
    helpfulVotes: integer("helpful_votes").default(0).notNull(),
    notHelpfulVotes: integer("not_helpful_votes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    contentUpdatedAt: timestamp("content_updated_at"), // Only set when content/impact/confidence are edited
    deletedAt: timestamp("deleted_at"), // Soft delete for audit trail
  },
  (table) => [
    index("claims_source_idx").on(table.sourceId),
    index("claims_user_idx").on(table.userId),
    index("claims_created_idx").on(table.createdAt),
    index("claims_active_idx")
      .on(table.sourceId, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "claims_impact_range",
      sql`${table.impact} >= 1 AND ${table.impact} <= 5`,
    ),
    check(
      "claims_confidence_range",
      sql`${table.confidence} >= 1 AND ${table.confidence} <= 5`,
    ),
  ],
);

// =============================================================================
// CLAIM EVIDENCE TABLE
// =============================================================================

export const claimEvidence = pgTable(
  "claim_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    url: text("url").notNull(), // Backblaze B2 URL or external link
    caption: text("caption"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("claim_evidence_claim_idx").on(table.claimId)],
);

// =============================================================================
// CLAIM VOTES TABLE (Composite Primary Key)
// =============================================================================

export const claimVotes = pgTable(
  "claim_votes",
  {
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isHelpful: boolean("is_helpful").notNull(), // true = helpful (agree), false = not helpful (disagree)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.claimId, table.userId] }),
    index("claim_votes_claim_idx").on(table.claimId),
  ],
);

// =============================================================================
// CLAIM COMMENTS TABLE (includes dispute functionality)
// =============================================================================

export const claimComments = pgTable(
  "claim_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(), // Comment text (10-1000 chars)
    isDispute: boolean("is_dispute").default(false).notNull(), // true = formal dispute of the claim
    helpfulVotes: integer("helpful_votes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("claim_comments_claim_idx").on(table.claimId),
    index("claim_comments_user_idx").on(table.userId),
  ],
);

// =============================================================================
// FLAGS TABLE
// =============================================================================

export const flags = pgTable(
  "flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(), // "claim", "source", "comment"
    targetId: uuid("target_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id), // Flagger
    reason: text("reason").notNull(), // Freeform: "spam", "abuse", "incorrect", "duplicate", etc.
    status: text("status").default("pending").notNull(), // "pending", "resolved", "dismissed"
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("flags_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
    index("flags_target_idx").on(table.targetType, table.targetId),
  ],
);

// =============================================================================
// MODERATION LOGS TABLE
// =============================================================================

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => user.id),
    action: text("action").notNull(), // "approve", "reject", "ban", "remove", etc.
    targetType: text("target_type").notNull(), // "source", "claim", "user", "comment"
    targetId: uuid("target_id").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("moderation_logs_moderator_idx").on(table.moderatorId),
    index("moderation_logs_target_idx").on(table.targetType, table.targetId),
    index("moderation_logs_created_idx").on(table.createdAt),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  parent: one(sources, {
    fields: [sources.parentId],
    references: [sources.id],
    relationName: "parentChild",
  }),
  children: many(sources, { relationName: "parentChild" }),
  createdBy: one(user, {
    fields: [sources.createdByUserId],
    references: [user.id],
  }),
  scoreCache: one(sourceScoreCache, {
    fields: [sources.id],
    references: [sourceScoreCache.sourceId],
  }),
  claims: many(claims),
  paths: many(sourcePaths, { relationName: "sourcePaths" }),
  descendantPaths: many(sourcePaths, { relationName: "ancestorPaths" }),
}));

export const sourcePathsRelations = relations(sourcePaths, ({ one }) => ({
  source: one(sources, {
    fields: [sourcePaths.sourceId],
    references: [sources.id],
    relationName: "sourcePaths",
  }),
  ancestor: one(sources, {
    fields: [sourcePaths.ancestorId],
    references: [sources.id],
    relationName: "ancestorPaths",
  }),
}));

export const sourceScoreCacheRelations = relations(
  sourceScoreCache,
  ({ one }) => ({
    source: one(sources, {
      fields: [sourceScoreCache.sourceId],
      references: [sources.id],
    }),
  }),
);

export const claimsRelations = relations(claims, ({ one, many }) => ({
  source: one(sources, {
    fields: [claims.sourceId],
    references: [sources.id],
  }),
  user: one(user, {
    fields: [claims.userId],
    references: [user.id],
  }),
  evidence: many(claimEvidence),
  votes: many(claimVotes),
  comments: many(claimComments),
}));

export const claimEvidenceRelations = relations(claimEvidence, ({ one }) => ({
  claim: one(claims, {
    fields: [claimEvidence.claimId],
    references: [claims.id],
  }),
}));

export const claimVotesRelations = relations(claimVotes, ({ one }) => ({
  claim: one(claims, {
    fields: [claimVotes.claimId],
    references: [claims.id],
  }),
  user: one(user, {
    fields: [claimVotes.userId],
    references: [user.id],
  }),
}));

export const claimCommentsRelations = relations(claimComments, ({ one }) => ({
  claim: one(claims, {
    fields: [claimComments.claimId],
    references: [claims.id],
  }),
  user: one(user, {
    fields: [claimComments.userId],
    references: [user.id],
  }),
}));

export const flagsRelations = relations(flags, ({ one }) => ({
  user: one(user, {
    fields: [flags.userId],
    references: [user.id],
    relationName: "flagger",
  }),
  resolvedBy: one(user, {
    fields: [flags.resolvedByUserId],
    references: [user.id],
    relationName: "resolver",
  }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  moderator: one(user, {
    fields: [moderationLogs.moderatorId],
    references: [user.id],
  }),
}));

// Update user relations to include new tables
export const extendedUserRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  createdSources: many(sources),
  claims: many(claims),
  claimVotes: many(claimVotes),
  claimComments: many(claimComments),
  flags: many(flags, { relationName: "flagger" }),
  resolvedFlags: many(flags, { relationName: "resolver" }),
  moderationLogs: many(moderationLogs),
}));
