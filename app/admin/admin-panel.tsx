"use client";

import { useState } from "react";
import type { MarketCard } from "../../lib/store";

export function AdminPanel({
  markets,
  latestSync,
}: {
  markets: MarketCard[];
  latestSync: {
    sourceUrl: string;
    status: string;
    message: string | null;
    marketsFound: number;
    completedAt: string | null;
  } | null;
}) {
  const [sourceUrl, setSourceUrl] = useState(
    "https://battlebots.com/event/battlebots-pro-league-episode-106/",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl }),
    });
    const payload = (await response.json()) as { error?: string; marketsFound?: number };
    setMessage(
      response.ok
        ? `Sync complete: ${payload.marketsFound ?? 0} markets found.`
        : payload.error ?? "Sync failed.",
    );
    setLoading(false);
    if (response.ok) window.setTimeout(() => window.location.reload(), 600);
  }

  async function resolve(
    market: MarketCard,
    form: HTMLFormElement,
  ) {
    setLoading(true);
    setMessage("");
    const formData = new FormData(form);
    const response = await fetch(`/api/admin/markets/${market.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: formData.get("outcome"),
        evidenceUrl: formData.get("evidenceUrl"),
      }),
    });
    const payload = (await response.json()) as { error?: string; settledAccounts?: number };
    setMessage(
      response.ok
        ? `Resolved ${market.botA.name} vs ${market.botB.name}; ${payload.settledAccounts ?? 0} accounts settled.`
        : payload.error ?? "Resolution failed.",
    );
    setLoading(false);
    if (response.ok) window.setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Bright Data</p><h2>Synchronize a card</h2></div></div>
        <label className="admin-field">
          <span>Official episode URL</span>
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" />
        </label>
        <button className="button button-primary" disabled={loading} onClick={sync}>
          {loading ? "Working…" : "Sync fight card"}
        </button>
        {latestSync ? (
          <div className="sync-result">
            <strong>{latestSync.status}</strong>
            <span>{latestSync.message ?? latestSync.sourceUrl}</span>
          </div>
        ) : null}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Settlement queue</p><h2>Confirm outcomes</h2></div></div>
        <div className="resolution-list">
          {markets.map((market) => (
            <form
              key={market.id}
              onSubmit={(event) => {
                event.preventDefault();
                resolve(market, event.currentTarget);
              }}
            >
              <div><strong>{market.botA.name} vs {market.botB.name}</strong><span>{market.status}</span></div>
              <select aria-label={`Outcome for ${market.botA.name} versus ${market.botB.name}`} defaultValue="A" name="outcome">
                <option value="A">{market.botA.name} wins</option>
                <option value="B">{market.botB.name} wins</option>
                <option value="VOID">Void market</option>
              </select>
              <input aria-label="Evidence URL" name="evidenceUrl" placeholder="YouTube or official result URL" required type="url" />
              <button disabled={loading || ["resolved", "voided"].includes(market.status)} type="submit">Resolve</button>
            </form>
          ))}
        </div>
      </section>
      {message ? <p className="admin-message" role="status">{message}</p> : null}
    </div>
  );
}
