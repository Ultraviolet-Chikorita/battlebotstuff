import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { Header } from "../../components/Header";
import { PriceHistory } from "../../components/PriceHistory";
import {
  formatCredits,
  formatPercent,
  formatShares,
} from "../../components/format";
import { Footer } from "../../page";
import {
  getMarketBySlug,
  getPriceHistory,
  getRecentTrades,
} from "../../../lib/store";
import { TradePanel } from "./trade-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  return {
    title: market
      ? `${market.botA.name} vs ${market.botB.name}`
      : "Market",
  };
}

function BotStats({
  name,
  wins,
  losses,
  knockouts,
  elo,
  team,
  weapon,
  side,
}: {
  name: string;
  wins: number;
  losses: number;
  knockouts: number;
  elo: number;
  team: string | null;
  weapon: string | null;
  side: "blue" | "red";
}) {
  return (
    <article className={`fighter-profile fighter-${side}`}>
      <div className="fighter-top">
        <span>{side} square</span>
        <strong>{elo} ELO</strong>
      </div>
      <h2>{name}</h2>
      <p>{team ?? "Independent team"}</p>
      <dl>
        <div><dt>Record</dt><dd>{wins}–{losses}</dd></div>
        <div><dt>Knockouts</dt><dd>{knockouts}</dd></div>
        <div><dt>Weapon</dt><dd>{weapon ?? "Undisclosed"}</dd></div>
      </dl>
    </article>
  );
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  if (!market) notFound();
  const [history, trades, user] = await Promise.all([
    getPriceHistory(market.id),
    getRecentTrades(market.id),
    getChatGPTUser(),
  ]);

  return (
    <div className="site-shell">
      <Header />
      <main className="market-detail">
        <div className="detail-breadcrumb">
          <Link href="/#fight-card">← All markets</Link>
          <span>Episode {market.episodeNumber} / Group {market.groupName}</span>
        </div>
        <section className="fight-marquee">
          <div className="fight-label">
            <span className={`status-pill status-${market.status}`}>{market.status}</span>
            <span>Trading closes {new Date(market.closesAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/London",
            })}</span>
          </div>
          <div className="fight-title">
            <div>
              <small>Blue square</small>
              <h1>{market.botA.name}</h1>
              <strong>{formatPercent(market.priceABps)}</strong>
            </div>
            <span>VS</span>
            <div className="align-right">
              <small>Red square</small>
              <h1>{market.botB.name}</h1>
              <strong>{formatPercent(market.priceBBps)}</strong>
            </div>
          </div>
          <div className="detail-meter">
            <span style={{ width: `${market.priceABps / 100}%` }} />
          </div>
          <div className="market-facts">
            <span><b>{formatCredits(market.volumeMilli)}</b> volume</span>
            <span><b>{formatPercent(market.initialPriceABps)}</b> model open</span>
            <span><b>2,500</b> liquidity</span>
            <a href={market.sourceUrl} target="_blank" rel="noreferrer">Official card ↗</a>
          </div>
        </section>

        <div className="detail-grid">
          <div>
            <section className="panel">
              <div className="panel-heading">
                <div><p className="eyebrow">The matchup</p><h2>Machine intelligence</h2></div>
                <span className="data-badge">Bright Data sourced</span>
              </div>
              <div className="fighter-grid">
                <BotStats {...market.botA} side="blue" />
                <BotStats {...market.botB} side="red" />
              </div>
              <p className="model-note">
                Opening probability uses an Elo model built from public fight
                histories. The live price is set entirely by players.
              </p>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><p className="eyebrow">Price action</p><h2>Blue square probability</h2></div>
                <strong>{formatPercent(market.priceABps)}</strong>
              </div>
              <PriceHistory points={history} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><p className="eyebrow">Tape</p><h2>Recent trades</h2></div>
              </div>
              {trades.length ? (
                <div className="trade-table" role="table" aria-label="Recent trades">
                  {trades.map((trade, index) => (
                    <div role="row" key={`${trade.createdAt}-${index}`}>
                      <span>{trade.handle}</span>
                      <span className={trade.outcome === "A" ? "text-blue" : "text-red"}>
                        {trade.action.toUpperCase()} {trade.outcome === "A" ? market.botA.name : market.botB.name}
                      </span>
                      <span>{formatShares(trade.sharesMilli)} shares</span>
                      <strong>{formatPercent(trade.priceBps)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No trades yet. The opening line is yours.</div>
              )}
            </section>
          </div>

          <aside>
            <TradePanel
              market={market}
              signedIn={Boolean(user)}
              signInPath={chatGPTSignInPath(`/markets/${market.slug}`)}
            />
            <div className="risk-note">
              <strong>Play-money only</strong>
              <p>Credits cannot be purchased, transferred, redeemed, or withdrawn.</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
