import { requireChatGPTUser } from "../chatgpt-auth";
import { Footer } from "../page";
import { Header } from "../components/Header";
import { getLatestSync, getMarkets, isAdminEmail } from "../../lib/store";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const isAdmin = isAdminEmail(user.email);
  const [markets, latestSync] = isAdmin
    ? await Promise.all([getMarkets(), getLatestSync()])
    : [[], null];
  return (
    <div className="site-shell">
      <Header />
      <main className="inner-page">
        <div className="page-title"><div><p className="eyebrow">Control room</p><h1>Market operations</h1></div><span className="data-badge">Restricted</span></div>
        {isAdmin ? (
          <AdminPanel markets={markets} latestSync={latestSync} />
        ) : (
          <section className="panel empty-state">
            This account is not listed in the ADMIN_EMAILS runtime setting.
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
