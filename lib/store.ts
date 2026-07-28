import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import type { ParsedEpisode } from "./battlebots-parser";
import {
  eloProbability,
  priceA,
  quoteTrade,
  seedQuantities,
  settlePayoutMilli,
  type Outcome,
  type TradeAction,
} from "./market-engine";
import { slugify } from "./battlebots-parser";

type RuntimeEnv = {
  ADMIN_EMAILS?: string;
  DB?: D1Database;
};

export type MarketCard = {
  id: string;
  slug: string;
  groupName: string;
  status: string;
  closesAt: string;
  episodeNumber: string;
  eventTitle: string;
  sourceUrl: string;
  botA: BotSummary;
  botB: BotSummary;
  priceABps: number;
  priceBBps: number;
  initialPriceABps: number;
  volumeMilli: number;
  qAMilli: number;
  qBMilli: number;
  liquidityMilli: number;
  version: number;
};

export type BotSummary = {
  id: string;
  slug: string;
  name: string;
  profileUrl: string | null;
  weapon: string | null;
  team: string | null;
  wins: number;
  losses: number;
  knockouts: number;
  elo: number;
};

type MarketRow = {
  id: string;
  slug: string;
  group_name: string;
  status: string;
  closes_at: string;
  episode_number: string;
  event_title: string;
  source_url: string;
  q_a_milli: number;
  q_b_milli: number;
  liquidity_milli: number;
  initial_price_a_bps: number;
  volume_milli: number;
  version: number;
  bot_a_id: string;
  bot_a_slug: string;
  bot_a_name: string;
  bot_a_profile_url: string | null;
  bot_a_weapon: string | null;
  bot_a_team: string | null;
  bot_a_wins: number;
  bot_a_losses: number;
  bot_a_knockouts: number;
  bot_a_elo: number;
  bot_b_id: string;
  bot_b_slug: string;
  bot_b_name: string;
  bot_b_profile_url: string | null;
  bot_b_weapon: string | null;
  bot_b_team: string | null;
  bot_b_wins: number;
  bot_b_losses: number;
  bot_b_knockouts: number;
  bot_b_elo: number;
};

const marketSelect = `
  SELECT
    m.id, m.slug, m.group_name, m.status, m.closes_at,
    m.q_a_milli, m.q_b_milli, m.liquidity_milli,
    m.initial_price_a_bps, m.volume_milli, m.version,
    e.episode_number, e.title AS event_title, e.source_url,
    a.id AS bot_a_id, a.slug AS bot_a_slug, a.name AS bot_a_name,
    a.profile_url AS bot_a_profile_url, a.weapon AS bot_a_weapon,
    a.team AS bot_a_team, a.wins AS bot_a_wins, a.losses AS bot_a_losses,
    a.knockouts AS bot_a_knockouts, a.elo AS bot_a_elo,
    b.id AS bot_b_id, b.slug AS bot_b_slug, b.name AS bot_b_name,
    b.profile_url AS bot_b_profile_url, b.weapon AS bot_b_weapon,
    b.team AS bot_b_team, b.wins AS bot_b_wins, b.losses AS bot_b_losses,
    b.knockouts AS bot_b_knockouts, b.elo AS bot_b_elo
  FROM markets m
  JOIN events e ON e.id = m.event_id
  JOIN bots a ON a.id = m.bot_a_id
  JOIN bots b ON b.id = m.bot_b_id
`;

let schemaReady: Promise<void> | null = null;

function db(): D1Database {
  const binding = (env as unknown as RuntimeEnv).DB;
  if (!binding) throw new Error("D1 binding DB is unavailable.");
  return binding;
}

export async function ensureSchema(): Promise<void> {
  schemaReady ??= initializeSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function initializeSchema(): Promise<void> {
  const database = db();
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, handle TEXT NOT NULL UNIQUE,
      balance_milli INTEGER NOT NULL DEFAULT 10000000,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      profile_url TEXT, weapon TEXT, team TEXT,
      wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
      knockouts INTEGER NOT NULL DEFAULT 0, elo INTEGER NOT NULL DEFAULT 1500,
      source_updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, episode_number TEXT NOT NULL, title TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE, scheduled_at TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, source_hash TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, event_id TEXT NOT NULL,
      group_name TEXT NOT NULL, bot_a_id TEXT NOT NULL, bot_b_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', closes_at TEXT NOT NULL,
      liquidity_milli INTEGER NOT NULL DEFAULT 2500000,
      q_a_milli INTEGER NOT NULL DEFAULT 0, q_b_milli INTEGER NOT NULL DEFAULT 0,
      initial_price_a_bps INTEGER NOT NULL DEFAULT 5000,
      volume_milli INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 0,
      winner_outcome TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, group_name, bot_a_id, bot_b_id)
    )`,
    `CREATE TABLE IF NOT EXISTS positions (
      user_id TEXT NOT NULL, market_id TEXT NOT NULL,
      shares_a_milli INTEGER NOT NULL DEFAULT 0,
      shares_b_milli INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, market_id)
    )`,
    `CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, market_id TEXT NOT NULL,
      outcome TEXT NOT NULL, action TEXT NOT NULL, shares_milli INTEGER NOT NULL,
      cost_milli INTEGER NOT NULL, price_bps INTEGER NOT NULL,
      expected_market_version INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS price_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT, market_id TEXT NOT NULL,
      price_a_bps INTEGER NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY, source_url TEXT NOT NULL, status TEXT NOT NULL,
      message TEXT, markets_found INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS resolutions (
      market_id TEXT PRIMARY KEY, outcome TEXT NOT NULL, evidence_url TEXT NOT NULL,
      evidence_title TEXT, evidence_excerpt TEXT, resolved_by TEXT NOT NULL,
      resolved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS markets_status_idx ON markets(status, closes_at)`,
    `CREATE INDEX IF NOT EXISTS trades_market_idx ON trades(market_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS price_samples_market_idx ON price_samples(market_id, recorded_at)`,
    `CREATE TRIGGER IF NOT EXISTS trades_validate_v2 BEFORE INSERT ON trades
    BEGIN
      SELECT CASE WHEN COALESCE((SELECT status FROM markets WHERE id = NEW.market_id), '') <> 'open'
        THEN RAISE(ABORT, 'market is not open') END;
      SELECT CASE WHEN datetime((SELECT closes_at FROM markets WHERE id = NEW.market_id)) <= datetime('now')
        THEN RAISE(ABORT, 'market is closed') END;
      SELECT CASE WHEN (SELECT version FROM markets WHERE id = NEW.market_id) <> NEW.expected_market_version
        THEN RAISE(ABORT, 'market price changed') END;
      SELECT CASE WHEN NEW.action = 'buy'
        AND COALESCE((SELECT balance_milli FROM users WHERE id = NEW.user_id), -1) < NEW.cost_milli
        THEN RAISE(ABORT, 'insufficient credits') END;
      SELECT CASE WHEN NEW.action = 'sell' AND NEW.outcome = 'A'
        AND COALESCE((SELECT shares_a_milli FROM positions WHERE user_id = NEW.user_id AND market_id = NEW.market_id), 0) < NEW.shares_milli
        THEN RAISE(ABORT, 'insufficient shares') END;
      SELECT CASE WHEN NEW.action = 'sell' AND NEW.outcome = 'B'
        AND COALESCE((SELECT shares_b_milli FROM positions WHERE user_id = NEW.user_id AND market_id = NEW.market_id), 0) < NEW.shares_milli
        THEN RAISE(ABORT, 'insufficient shares') END;
    END`,
    `CREATE TRIGGER IF NOT EXISTS trades_apply AFTER INSERT ON trades
    BEGIN
      UPDATE users SET balance_milli = balance_milli - NEW.cost_milli WHERE id = NEW.user_id;
      INSERT INTO positions(user_id, market_id, shares_a_milli, shares_b_milli, updated_at)
      VALUES(
        NEW.user_id, NEW.market_id,
        CASE WHEN NEW.outcome = 'A' THEN CASE WHEN NEW.action = 'buy' THEN NEW.shares_milli ELSE -NEW.shares_milli END ELSE 0 END,
        CASE WHEN NEW.outcome = 'B' THEN CASE WHEN NEW.action = 'buy' THEN NEW.shares_milli ELSE -NEW.shares_milli END ELSE 0 END,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(user_id, market_id) DO UPDATE SET
        shares_a_milli = shares_a_milli + excluded.shares_a_milli,
        shares_b_milli = shares_b_milli + excluded.shares_b_milli,
        updated_at = CURRENT_TIMESTAMP;
      UPDATE markets SET
        q_a_milli = q_a_milli + CASE WHEN NEW.outcome = 'A' THEN CASE WHEN NEW.action = 'buy' THEN NEW.shares_milli ELSE -NEW.shares_milli END ELSE 0 END,
        q_b_milli = q_b_milli + CASE WHEN NEW.outcome = 'B' THEN CASE WHEN NEW.action = 'buy' THEN NEW.shares_milli ELSE -NEW.shares_milli END ELSE 0 END,
        volume_milli = volume_milli + ABS(NEW.cost_milli),
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.market_id;
    END`,
  ];
  await database.batch(statements.map((statement) => database.prepare(statement)));
  await seedDemoCard();
}

async function seedDemoCard() {
  const database = db();
  const bots = [
    ["ribbot", "Ribbot", "Modular spinner", "Team Ribbot", 18, 9, 11, 1642],
    ["witch-doctor", "Witch Doctor", "Vertical spinner", "Team Witch Doctor", 25, 11, 18, 1716],
    ["huge", "HUGE", "Overhead vertical spinner", "Team HUGE", 20, 12, 12, 1658],
    ["minotaur", "Minotaur", "Drum spinner", "Team RioBotz", 24, 10, 19, 1738],
    ["death-roll", "Death Roll", "Vertical spinner", "Team DeathRoll", 15, 7, 12, 1630],
    ["malice", "Malice", "Horizontal spinner", "Team Malice", 12, 10, 8, 1558],
  ] as const;
  const statements = bots.map((bot) =>
    database
      .prepare(
        `INSERT OR IGNORE INTO bots
        (id, slug, name, profile_url, weapon, team, wins, losses, knockouts, elo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        bot[0],
        bot[0],
        bot[1],
        `https://battlebots.com/robot/${bot[0]}/`,
        bot[2],
        bot[3],
        bot[4],
        bot[5],
        bot[6],
        bot[7],
      ),
  );
  statements.push(
    database
      .prepare(
        `INSERT OR IGNORE INTO events
        (id, episode_number, title, source_url, scheduled_at, source_hash)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "pro-league-106",
        "106",
        "Pro League Episode 106",
        "https://battlebots.com/event/battlebots-pro-league-episode-106/",
        "2026-08-06T20:00:00.000Z",
        "starter-verified-card",
      ),
  );

  const fights = [
    ["group-f-ribbot-vs-witch-doctor", "F", "ribbot", "witch-doctor", 1642, 1716],
    ["group-e-huge-vs-minotaur", "E", "huge", "minotaur", 1658, 1738],
    ["group-d-death-roll-vs-malice", "D", "death-roll", "malice", 1630, 1558],
  ] as const;
  for (const [slug, group, botA, botB, eloA, eloB] of fights) {
    const probabilityBps = Math.round(eloProbability(eloA, eloB) * 10_000);
    const quantities = seedQuantities(probabilityBps);
    statements.push(
      database
        .prepare(
          `INSERT OR IGNORE INTO markets
          (id, slug, event_id, group_name, bot_a_id, bot_b_id, closes_at,
           q_a_milli, q_b_milli, initial_price_a_bps)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          slug,
          slug,
          "pro-league-106",
          group,
          botA,
          botB,
          "2026-08-06T20:00:00.000Z",
          quantities.qAMilli,
          quantities.qBMilli,
          probabilityBps,
        ),
    );
    statements.push(
      database
        .prepare(
          `INSERT INTO price_samples(market_id, price_a_bps)
           SELECT ?, ? WHERE NOT EXISTS (
             SELECT 1 FROM price_samples WHERE market_id = ?
           )`,
        )
        .bind(slug, probabilityBps, slug),
    );
  }
  await database.batch(statements);
}

function mapMarket(row: MarketRow): MarketCard {
  const priceABps = Math.round(
    priceA({
      qAMilli: row.q_a_milli,
      qBMilli: row.q_b_milli,
      liquidityMilli: row.liquidity_milli,
    }) * 10_000,
  );
  return {
    id: row.id,
    slug: row.slug,
    groupName: row.group_name,
    status: row.status,
    closesAt: row.closes_at,
    episodeNumber: row.episode_number,
    eventTitle: row.event_title,
    sourceUrl: row.source_url,
    priceABps,
    priceBBps: 10_000 - priceABps,
    initialPriceABps: row.initial_price_a_bps,
    volumeMilli: row.volume_milli,
    qAMilli: row.q_a_milli,
    qBMilli: row.q_b_milli,
    liquidityMilli: row.liquidity_milli,
    version: row.version,
    botA: {
      id: row.bot_a_id,
      slug: row.bot_a_slug,
      name: row.bot_a_name,
      profileUrl: row.bot_a_profile_url,
      weapon: row.bot_a_weapon,
      team: row.bot_a_team,
      wins: row.bot_a_wins,
      losses: row.bot_a_losses,
      knockouts: row.bot_a_knockouts,
      elo: row.bot_a_elo,
    },
    botB: {
      id: row.bot_b_id,
      slug: row.bot_b_slug,
      name: row.bot_b_name,
      profileUrl: row.bot_b_profile_url,
      weapon: row.bot_b_weapon,
      team: row.bot_b_team,
      wins: row.bot_b_wins,
      losses: row.bot_b_losses,
      knockouts: row.bot_b_knockouts,
      elo: row.bot_b_elo,
    },
  };
}

async function closeExpiredMarkets() {
  await db()
    .prepare(
      `UPDATE markets SET status = 'closed', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'open' AND datetime(closes_at) <= datetime('now')`,
    )
    .run();
}

export async function getMarkets(): Promise<MarketCard[]> {
  await ensureSchema();
  await closeExpiredMarkets();
  const result = await db()
    .prepare(`${marketSelect} ORDER BY e.scheduled_at ASC, m.group_name ASC`)
    .all<MarketRow>();
  return result.results.map(mapMarket);
}

export async function getMarketBySlug(slug: string): Promise<MarketCard | null> {
  await ensureSchema();
  await closeExpiredMarkets();
  const row = await db()
    .prepare(`${marketSelect} WHERE m.slug = ? LIMIT 1`)
    .bind(slug)
    .first<MarketRow>();
  return row ? mapMarket(row) : null;
}

export async function getMarketById(id: string): Promise<MarketCard | null> {
  await ensureSchema();
  await closeExpiredMarkets();
  const row = await db()
    .prepare(`${marketSelect} WHERE m.id = ? LIMIT 1`)
    .bind(id)
    .first<MarketRow>();
  return row ? mapMarket(row) : null;
}

export async function getPriceHistory(marketId: string) {
  await ensureSchema();
  const result = await db()
    .prepare(
      `SELECT price_a_bps AS priceABps, recorded_at AS recordedAt
       FROM price_samples WHERE market_id = ?
       ORDER BY recorded_at ASC LIMIT 40`,
    )
    .bind(marketId)
    .all<{ priceABps: number; recordedAt: string }>();
  return result.results;
}

export async function getRecentTrades(marketId: string) {
  await ensureSchema();
  const result = await db()
    .prepare(
      `SELECT u.handle, t.outcome, t.action,
        t.shares_milli AS sharesMilli, t.price_bps AS priceBps,
        t.created_at AS createdAt
       FROM trades t JOIN users u ON u.id = t.user_id
       WHERE t.market_id = ? ORDER BY t.created_at DESC LIMIT 12`,
    )
    .bind(marketId)
    .all<{
      handle: string;
      outcome: Outcome;
      action: TradeAction;
      sharesMilli: number;
      priceBps: number;
      createdAt: string;
    }>();
  return result.results;
}

async function hashEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .slice(0, 12)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureUser(user: ChatGPTUser) {
  await ensureSchema();
  const id = await hashEmail(user.email);
  const handle = `Trader-${id.slice(0, 4).toUpperCase()}`;
  await db()
    .prepare(
      `INSERT OR IGNORE INTO users(id, email, handle, balance_milli)
       VALUES (?, ?, ?, 10000000)`,
    )
    .bind(id, user.email.trim().toLowerCase(), handle)
    .run();
  return db()
    .prepare(
      `SELECT id, handle, balance_milli AS balanceMilli
       FROM users WHERE id = ?`,
    )
    .bind(id)
    .first<{ id: string; handle: string; balanceMilli: number }>();
}

export async function getPortfolio(user: ChatGPTUser) {
  const account = await ensureUser(user);
  if (!account) throw new Error("Could not create user account.");
  const result = await db()
    .prepare(
      `SELECT p.market_id AS marketId, p.shares_a_milli AS sharesAMilli,
        p.shares_b_milli AS sharesBMilli, m.slug, m.status,
        a.name AS botAName, b.name AS botBName
       FROM positions p
       JOIN markets m ON m.id = p.market_id
       JOIN bots a ON a.id = m.bot_a_id
       JOIN bots b ON b.id = m.bot_b_id
       WHERE p.user_id = ? AND (p.shares_a_milli > 0 OR p.shares_b_milli > 0)
       ORDER BY p.updated_at DESC`,
    )
    .bind(account.id)
    .all<{
      marketId: string;
      sharesAMilli: number;
      sharesBMilli: number;
      slug: string;
      status: string;
      botAName: string;
      botBName: string;
    }>();
  return { account, positions: result.results };
}

export async function getLeaderboard() {
  await ensureSchema();
  const result = await db()
    .prepare(
      `SELECT u.handle, u.balance_milli AS balanceMilli,
        COALESCE(SUM(p.shares_a_milli + p.shares_b_milli), 0) AS openSharesMilli,
        COUNT(DISTINCT t.id) AS trades
       FROM users u
       LEFT JOIN positions p ON p.user_id = u.id
       LEFT JOIN trades t ON t.user_id = u.id
       GROUP BY u.id
       ORDER BY u.balance_milli DESC, trades DESC LIMIT 25`,
    )
    .all<{
      handle: string;
      balanceMilli: number;
      openSharesMilli: number;
      trades: number;
    }>();
  return result.results;
}

export async function createQuote(
  marketId: string,
  outcome: Outcome,
  action: TradeAction,
  sharesMilli: number,
) {
  const market = await getMarketById(marketId);
  if (!market) throw new Error("Market not found.");
  if (market.status !== "open") throw new Error("Market is closed.");
  return {
    ...quoteTrade(market, outcome, action, sharesMilli),
    marketVersion: market.version,
  };
}

export async function executeTrade(
  user: ChatGPTUser,
  input: {
    idempotencyKey: string;
    marketId: string;
    outcome: Outcome;
    action: TradeAction;
    sharesMilli: number;
    limitPriceBps: number;
  },
) {
  const account = await ensureUser(user);
  if (!account) throw new Error("Account unavailable.");
  const existing = await db()
    .prepare(
      `SELECT id, cost_milli AS costMilli, price_bps AS priceBps
       FROM trades WHERE id = ? AND user_id = ?`,
    )
    .bind(input.idempotencyKey, account.id)
    .first<{ id: string; costMilli: number; priceBps: number }>();
  if (existing) return { idempotent: true, trade: existing };

  const market = await getMarketById(input.marketId);
  if (!market || market.status !== "open") throw new Error("Market is closed.");
  const quote = quoteTrade(market, input.outcome, input.action, input.sharesMilli);
  if (
    (input.action === "buy" &&
      quote.averagePriceBps > input.limitPriceBps) ||
    (input.action === "sell" &&
      quote.averagePriceBps < input.limitPriceBps)
  ) {
    throw new Error("Price moved beyond your limit.");
  }

  await db()
    .prepare(
      `INSERT INTO trades
       (id, user_id, market_id, outcome, action, shares_milli, cost_milli,
        price_bps, expected_market_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.idempotencyKey,
      account.id,
      input.marketId,
      input.outcome,
      input.action,
      input.sharesMilli,
      quote.costMilli,
      quote.averagePriceBps,
      market.version,
    )
    .run();

  await db()
    .prepare(
      `INSERT INTO price_samples(market_id, price_a_bps) VALUES (?, ?)`,
    )
    .bind(input.marketId, quote.priceABpsAfter)
    .run();
  const portfolio = await getPortfolio(user);
  return {
    idempotent: false,
    quote,
    balanceMilli: portfolio.account.balanceMilli,
    position: portfolio.positions.find(
      (position) => position.marketId === input.marketId,
    ),
  };
}

export function isAdminEmail(email: string): boolean {
  const configured = (env as unknown as RuntimeEnv).ADMIN_EMAILS ?? "";
  return configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export async function syncEpisode(
  episode: ParsedEpisode,
  sourceUrl: string,
  sourceHash: string,
) {
  await ensureSchema();
  const database = db();
  const eventId = `pro-league-${slugify(episode.episodeNumber)}`;
  await database
    .prepare(
      `INSERT INTO events(id, episode_number, title, source_url, scheduled_at, source_hash, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(source_url) DO UPDATE SET
         episode_number = excluded.episode_number,
         title = excluded.title,
         scheduled_at = excluded.scheduled_at,
         source_hash = excluded.source_hash,
         fetched_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      eventId,
      episode.episodeNumber,
      episode.title,
      sourceUrl,
      episode.scheduledAt,
      sourceHash,
    )
    .run();

  for (const fight of episode.fights) {
    const botA = slugify(fight.botA);
    const botB = slugify(fight.botB);
    await database.batch([
      database
        .prepare(
          `INSERT OR IGNORE INTO bots(id, slug, name, elo) VALUES (?, ?, ?, 1500)`,
        )
        .bind(botA, botA, fight.botA),
      database
        .prepare(
          `INSERT OR IGNORE INTO bots(id, slug, name, elo) VALUES (?, ?, ?, 1500)`,
        )
        .bind(botB, botB, fight.botB),
    ]);
    const slug = `episode-${slugify(episode.episodeNumber)}-${slugify(fight.group)}-${botA}-vs-${botB}`;
    await database
      .prepare(
        `INSERT INTO markets
         (id, slug, event_id, group_name, bot_a_id, bot_b_id, closes_at,
          q_a_milli, q_b_milli, initial_price_a_bps)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 5000)
         ON CONFLICT(event_id, group_name, bot_a_id, bot_b_id) DO UPDATE SET
           closes_at = CASE WHEN markets.status = 'open' THEN excluded.closes_at ELSE markets.closes_at END,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        slug,
        slug,
        eventId,
        fight.group,
        botA,
        botB,
        episode.scheduledAt,
      )
      .run();
  }
  return { eventId, marketsFound: episode.fights.length };
}

export async function resolveMarket(
  user: ChatGPTUser,
  marketId: string,
  outcome: "A" | "B" | "VOID",
  evidence: { url: string; title: string | null; excerpt: string | null },
) {
  if (!isAdminEmail(user.email)) throw new Error("Administrator access required.");
  await ensureSchema();
  const market = await db()
    .prepare(`SELECT status FROM markets WHERE id = ?`)
    .bind(marketId)
    .first<{ status: string }>();
  if (!market) throw new Error("Market not found.");
  if (market.status === "resolved" || market.status === "voided") {
    throw new Error("Market has already been resolved.");
  }
  const positions = await db()
    .prepare(
      `SELECT user_id AS userId, shares_a_milli AS sharesAMilli,
        shares_b_milli AS sharesBMilli FROM positions WHERE market_id = ?`,
    )
    .bind(marketId)
    .all<{ userId: string; sharesAMilli: number; sharesBMilli: number }>();
  const statements = positions.results.map((position) =>
    db()
      .prepare(`UPDATE users SET balance_milli = balance_milli + ? WHERE id = ?`)
      .bind(
        settlePayoutMilli(
          outcome,
          position.sharesAMilli,
          position.sharesBMilli,
        ),
        position.userId,
      ),
  );
  statements.push(
    db()
      .prepare(
        `INSERT INTO resolutions
         (market_id, outcome, evidence_url, evidence_title, evidence_excerpt, resolved_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        marketId,
        outcome,
        evidence.url,
        evidence.title,
        evidence.excerpt,
        user.email,
      ),
    db()
      .prepare(
        `UPDATE markets SET status = ?, winner_outcome = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(outcome === "VOID" ? "voided" : "resolved", outcome, marketId),
  );
  await db().batch(statements);
  return { settledAccounts: positions.results.length };
}

export async function getLatestSync() {
  await ensureSchema();
  return db()
    .prepare(
      `SELECT source_url AS sourceUrl, status, message,
        markets_found AS marketsFound, completed_at AS completedAt
       FROM sync_runs ORDER BY created_at DESC LIMIT 1`,
    )
    .first<{
      sourceUrl: string;
      status: string;
      message: string | null;
      marketsFound: number;
      completedAt: string | null;
    }>();
}

export async function recordSync(input: {
  id: string;
  sourceUrl: string;
  status: "running" | "success" | "warning" | "failed";
  message?: string;
  marketsFound?: number;
  complete?: boolean;
}) {
  await ensureSchema();
  await db()
    .prepare(
      `INSERT INTO sync_runs(id, source_url, status, message, markets_found, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status,
         message = excluded.message, markets_found = excluded.markets_found,
         completed_at = excluded.completed_at`,
    )
    .bind(
      input.id,
      input.sourceUrl,
      input.status,
      input.message ?? null,
      input.marketsFound ?? 0,
      input.complete ? new Date().toISOString() : null,
    )
    .run();
}
