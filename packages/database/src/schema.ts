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
  jsonb,
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
  // Application-specific fields
  username: text("username").unique(),
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
// SOURCE SCORE CACHE TABLE
// =============================================================================

export const sourceScoreCache = pgTable(
  "source_score_cache",
  {
    sourceId: uuid("source_id")
      .primaryKey()
      .references(() => sources.id, { onDelete: "cascade" }),
    tier: numeric("tier", { precision: 2, scale: 1 }), // 0-6 scale
    reviewCount: integer("review_count").default(0).notNull(),
    tierDistribution:
      jsonb("tier_distribution").$type<Record<number, number>>(), // {0: count, 1: count, ..., 6: count}
    lastCalculatedAt: timestamp("last_calculated_at"),
    recalculationRequestedAt: timestamp("recalculation_requested_at"),
  },
  (table) => [index("source_score_cache_tier_idx").on(table.tier)],
);

// =============================================================================
// REVIEWS TABLE
// =============================================================================

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    tier: integer("tier").notNull(), // 0-6 scale (Pure Artisanal to Pure AI Slop)
    content: text("content").notNull(),
    helpfulVotes: integer("helpful_votes").default(0).notNull(),
    notHelpfulVotes: integer("not_helpful_votes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete for audit trail
  },
  (table) => [
    index("reviews_source_idx").on(table.sourceId),
    index("reviews_user_idx").on(table.userId),
    index("reviews_created_idx").on(table.createdAt),
    index("reviews_active_idx")
      .on(table.sourceId, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
    check("reviews_tier_range", sql`${table.tier} >= 0 AND ${table.tier} <= 6`),
  ],
);

// =============================================================================
// REVIEW EVIDENCE TABLE
// =============================================================================

export const reviewEvidence = pgTable(
  "review_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    url: text("url").notNull(), // Backblaze B2 URL or external link
    caption: text("caption"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("review_evidence_review_idx").on(table.reviewId)],
);

// =============================================================================
// REVIEW VOTES TABLE (Composite Primary Key)
// =============================================================================

export const reviewVotes = pgTable(
  "review_votes",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isHelpful: boolean("is_helpful").notNull(), // true = helpful, false = not helpful
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.userId] }),
    index("review_votes_review_idx").on(table.reviewId),
  ],
);

// =============================================================================
// FLAGS TABLE
// =============================================================================

export const flags = pgTable(
  "flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(), // "review", "source"
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
    targetType: text("target_type").notNull(), // "source", "review", "user"
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
  reviews: many(reviews),
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

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  source: one(sources, {
    fields: [reviews.sourceId],
    references: [sources.id],
  }),
  user: one(user, {
    fields: [reviews.userId],
    references: [user.id],
  }),
  evidence: many(reviewEvidence),
  votes: many(reviewVotes),
}));

export const reviewEvidenceRelations = relations(reviewEvidence, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewEvidence.reviewId],
    references: [reviews.id],
  }),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
  user: one(user, {
    fields: [reviewVotes.userId],
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
  reviews: many(reviews),
  reviewVotes: many(reviewVotes),
  flags: many(flags, { relationName: "flagger" }),
  resolvedFlags: many(flags, { relationName: "resolver" }),
  moderationLogs: many(moderationLogs),
}));
