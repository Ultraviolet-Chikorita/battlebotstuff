import Link from "next/link";
import { Header } from "./components/Header";
import { Countdown } from "./components/Countdown";
import { formatCredits, formatPercent } from "./components/format";
import { getLatestSync, getMarkets } from "../lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [markets, latestSync] = await Promise.all([getMarkets(), getLatestSync()]);
  const openMarkets = markets.filter((market) => market.status === "open");
  const lead = openMarkets[0] ?? markets[0];
  const totalVolume = markets.reduce(
    (sum, market) => sum + market.volumeMilli,
    0,
  );

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="pulse-dot" /> Pro League prediction exchange
            </p>
            <h1>
              Call the fight
              <span>before the sparks fly.</span>
            </h1>
            <p className="hero-lede">
              Back the bot you believe in. Prices move with every trade.
              Bragging rights are the only thing on the line.
            </p>
            <div className="hero-actions">
              {lead ? (
                <Link className="button button-primary" href={`/markets/${lead.slug}`}>
                  Trade the next fight <span aria-hidden="true">↗</span>
                </Link>
              ) : null}
              <a className="button button-ghost" href="#fight-card">
                View fight card
              </a>
            </div>
          </div>
          <div className="hero-scoreboard" aria-label="Market overview">
            <div className="scoreboard-top">
              <span>Next bell</span>
              <span className="live-label">Markets open</span>
            </div>
            {lead ? (
              <>
                <div className="scoreboard-bots">
                  <div>
                    <small>Blue square</small>
                    <strong>{lead.botA.name}</strong>
                    <span>{formatPercent(lead.priceABps)} chance</span>
                  </div>
                  <div className="versus">VS</div>
                  <div className="align-right">
                    <small>Red square</small>
                    <strong>{lead.botB.name}</strong>
                    <span>{formatPercent(lead.priceBBps)} chance</span>
                  </div>
                </div>
                <div className="probability-track" aria-hidden="true">
                  <span style={{ width: `${lead.priceABps / 100}%` }} />
                </div>
                <Countdown closesAt={lead.closesAt} />
              </>
            ) : (
              <p>No open fight card is available.</p>
            )}
          </div>
        </section>

        <section className="ticker" aria-label="Exchange statistics">
          <div><span>Open markets</span><strong>{openMarkets.length}</strong></div>
          <div><span>Virtual volume</span><strong>{formatCredits(totalVolume)}</strong></div>
          <div><span>Starting bankroll</span><strong>10,000 CR</strong></div>
          <div><span>Data feed</span><strong>Bright Data</strong></div>
        </section>

        <section className="market-section" id="fight-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The card</p>
              <h2>Choose your machine</h2>
            </div>
            <div className="source-state">
              <span className="source-light" />
              {latestSync?.completedAt
                ? `Synced ${new Date(latestSync.completedAt).toLocaleDateString("en-GB")}`
                : "Verified starter card"}
            </div>
          </div>

          <div className="market-grid">
            {markets.map((market, index) => (
              <Link
                className="market-card"
                href={`/markets/${market.slug}`}
                key={market.id}
              >
                <div className="market-card-head">
                  <span>Group {market.groupName}</span>
                  <span className={`status-pill status-${market.status}`}>
                    {market.status}
                  </span>
                </div>
                <div className="market-bots">
                  <div className="bot-side">
                    <span className="bot-index">0{index * 2 + 1}</span>
                    <h3>{market.botA.name}</h3>
                    <p>{market.botA.weapon ?? "Combat robot"}</p>
                    <strong className="price price-blue">
                      {formatPercent(market.priceABps)}
                    </strong>
                  </div>
                  <div className="market-vs">VS</div>
                  <div className="bot-side bot-side-red">
                    <span className="bot-index">0{index * 2 + 2}</span>
                    <h3>{market.botB.name}</h3>
                    <p>{market.botB.weapon ?? "Combat robot"}</p>
                    <strong className="price price-red">
                      {formatPercent(market.priceBBps)}
                    </strong>
                  </div>
                </div>
                <div className="market-meter">
                  <span style={{ width: `${market.priceABps / 100}%` }} />
                </div>
                <div className="market-card-foot">
                  <span>{formatCredits(market.volumeMilli)} traded</span>
                  <span>View market <b aria-hidden="true">→</b></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="how-section">
          <p className="eyebrow">How it works</p>
          <div className="how-grid">
            <article><span>01</span><h3>Pick a side</h3><p>Every share pays one credit if your bot wins.</p></article>
            <article><span>02</span><h3>Watch the price</h3><p>The crowd moves the odds with every virtual trade.</p></article>
            <article><span>03</span><h3>Climb the board</h3><p>Build your bankroll and prove your fight IQ.</p></article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div><strong>ARENA / ODDS</strong><span>Powered by public web data</span></div>
      <p>
        Play-money only. Unofficial BattleBots prediction game. Virtual credits
        have no cash value. BattleBots® is a trademark of BattleBots, Inc.
      </p>
      <a href="https://battlebots.com/proleague/" target="_blank" rel="noreferrer">
        Official Pro League ↗
      </a>
    </footer>
  );
}
