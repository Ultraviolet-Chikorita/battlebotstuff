import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    handle: text("handle").notNull(),
    balanceMilli: integer("balance_milli").notNull().default(10_000_000),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_handle_idx").on(table.handle),
  ],
);

export const bots = sqliteTable(
  "bots",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    profileUrl: text("profile_url"),
    weapon: text("weapon"),
    team: text("team"),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    knockouts: integer("knockouts").notNull().default(0),
    elo: integer("elo").notNull().default(1500),
    sourceUpdatedAt: text("source_updated_at"),
  },
  (table) => [uniqueIndex("bots_slug_idx").on(table.slug)],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    episodeNumber: text("episode_number").notNull(),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    sourceHash: text("source_hash"),
  },
  (table) => [
    uniqueIndex("events_source_url_idx").on(table.sourceUrl),
    index("events_scheduled_at_idx").on(table.scheduledAt),
  ],
);

export const markets = sqliteTable(
  "markets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    groupName: text("group_name").notNull(),
    botAId: text("bot_a_id")
      .notNull()
      .references(() => bots.id),
    botBId: text("bot_b_id")
      .notNull()
      .references(() => bots.id),
    status: text("status", {
      enum: ["open", "closed", "resolved", "voided"],
    })
      .notNull()
      .default("open"),
    closesAt: text("closes_at").notNull(),
    liquidityMilli: integer("liquidity_milli").notNull().default(2_500_000),
    qAMilli: integer("q_a_milli").notNull().default(0),
    qBMilli: integer("q_b_milli").notNull().default(0),
    initialPriceABps: integer("initial_price_a_bps").notNull().default(5000),
    volumeMilli: integer("volume_milli").notNull().default(0),
    version: integer("version").notNull().default(0),
    winnerOutcome: text("winner_outcome", { enum: ["A", "B", "VOID"] }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("markets_slug_idx").on(table.slug),
    uniqueIndex("markets_fight_idx").on(
      table.eventId,
      table.groupName,
      table.botAId,
      table.botBId,
    ),
    index("markets_status_idx").on(table.status, table.closesAt),
  ],
);

export const positions = sqliteTable(
  "positions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id),
    sharesAMilli: integer("shares_a_milli").notNull().default(0),
    sharesBMilli: integer("shares_b_milli").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userId, table.marketId] })],
);

export const trades = sqliteTable(
  "trades",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id),
    outcome: text("outcome", { enum: ["A", "B"] }).notNull(),
    action: text("action", { enum: ["buy", "sell"] }).notNull(),
    sharesMilli: integer("shares_milli").notNull(),
    costMilli: integer("cost_milli").notNull(),
    priceBps: integer("price_bps").notNull(),
    expectedMarketVersion: integer("expected_market_version").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("trades_market_idx").on(table.marketId, table.createdAt),
    index("trades_user_idx").on(table.userId, table.createdAt),
  ],
);

export const priceSamples = sqliteTable(
  "price_samples",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id),
    priceABps: integer("price_a_bps").notNull(),
    recordedAt: text("recorded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("price_samples_market_idx").on(table.marketId, table.recordedAt)],
);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  status: text("status", { enum: ["running", "success", "warning", "failed"] })
    .notNull(),
  message: text("message"),
  marketsFound: integer("markets_found").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
});

export const resolutions = sqliteTable("resolutions", {
  marketId: text("market_id")
    .primaryKey()
    .references(() => markets.id),
  outcome: text("outcome", { enum: ["A", "B", "VOID"] }).notNull(),
  evidenceUrl: text("evidence_url").notNull(),
  evidenceTitle: text("evidence_title"),
  evidenceExcerpt: text("evidence_excerpt"),
  resolvedBy: text("resolved_by").notNull(),
  resolvedAt: text("resolved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
