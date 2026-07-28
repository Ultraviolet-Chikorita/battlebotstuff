import Link from "next/link";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "../chatgpt-auth";

export async function Header() {
  const user = await getChatGPTUser();
  return (
    <header className="header">
      <Link className="wordmark" href="/" aria-label="Arena Odds home">
        <span className="wordmark-mark">AO</span>
        <span>ARENA / ODDS<small>Robot combat markets</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#fight-card">Markets</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        {user ? <Link href="/portfolio">Portfolio</Link> : null}
      </nav>
      {user ? (
        <a className="account-link" href={chatGPTSignOutPath("/")}>
          <span className="account-dot" />
          {user.displayName.split(" ")[0]}
          <small>Sign out</small>
        </a>
      ) : (
        <a className="button button-small" href={chatGPTSignInPath("/portfolio")}>
          Sign in to trade
        </a>
      )}
    </header>
  );
}
