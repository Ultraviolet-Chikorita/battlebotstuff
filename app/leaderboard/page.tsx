import { Footer } from "../page";
import { Header } from "../components/Header";
import { formatCredits, formatShares } from "../components/format";
import { getLeaderboard } from "../../lib/store";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const leaders = await getLeaderboard();
  return (
    <div className="site-shell">
      <Header />
      <main className="inner-page">
        <div className="page-title"><div><p className="eyebrow">The sharpest minds</p><h1>Leaderboard</h1></div><span className="data-badge">Pseudonymous by design</span></div>
        <section className="panel leaderboard-panel">
          <div className="leaderboard-head"><span>Rank</span><span>Player</span><span>Available</span><span>Open shares</span><span>Trades</span></div>
          {leaders.length ? leaders.map((leader, index) => (
            <div className="leaderboard-row" key={leader.handle}>
              <strong>#{String(index + 1).padStart(2, "0")}</strong>
              <span><i>{leader.handle.slice(-2)}</i>{leader.handle}</span>
              <b>{formatCredits(leader.balanceMilli)}</b>
              <span>{formatShares(leader.openSharesMilli)}</span>
              <span>{leader.trades}</span>
            </div>
          )) : (
            <div className="empty-state">The leaderboard lights up after the first trade.</div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
