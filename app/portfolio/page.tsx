import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";
import { Footer } from "../page";
import { Header } from "../components/Header";
import { formatCredits, formatShares } from "../components/format";
import { getPortfolio } from "../../lib/store";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireChatGPTUser("/portfolio");
  const { account, positions } = await getPortfolio(user);
  const openShares = positions.reduce(
    (sum, position) => sum + position.sharesAMilli + position.sharesBMilli,
    0,
  );
  return (
    <div className="site-shell">
      <Header />
      <main className="inner-page">
        <div className="page-title">
          <div><p className="eyebrow">Fight bankroll</p><h1>Your portfolio</h1></div>
          <span className="handle-chip">{account.handle}</span>
        </div>
        <section className="portfolio-stats">
          <article><span>Available credits</span><strong>{formatCredits(account.balanceMilli)}</strong></article>
          <article><span>Open shares</span><strong>{formatShares(openShares)}</strong></article>
          <article><span>Active positions</span><strong>{positions.length}</strong></article>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Positions</p><h2>Your calls</h2></div></div>
          {positions.length ? (
            <div className="position-list">
              {positions.map((position) => (
                <Link href={`/markets/${position.slug}`} key={position.marketId}>
                  <div><strong>{position.botAName} vs {position.botBName}</strong><span>{position.status}</span></div>
                  <div><span>{position.botAName}</span><b>{formatShares(position.sharesAMilli)}</b></div>
                  <div><span>{position.botBName}</span><b>{formatShares(position.sharesBMilli)}</b></div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>You have not backed a bot yet.</p>
              <Link className="button button-primary" href="/#fight-card">Browse markets</Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
