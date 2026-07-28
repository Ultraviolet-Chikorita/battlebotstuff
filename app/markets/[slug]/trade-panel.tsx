"use client";

import { useMemo, useState } from "react";
import type { MarketCard } from "../../../lib/store";
import type { Outcome, TradeAction } from "../../../lib/market-engine";
import { formatCredits, formatPercent } from "../../components/format";

type QuoteResult = {
  costMilli: number;
  averagePriceBps: number;
  priceABpsAfter: number;
  marketVersion: number;
};

export function TradePanel({
  market,
  signedIn,
  signInPath,
}: {
  market: MarketCard;
  signedIn: boolean;
  signInPath: string;
}) {
  const [outcome, setOutcome] = useState<Outcome>("A");
  const [action, setAction] = useState<TradeAction>("buy");
  const [shares, setShares] = useState("100");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPrice = outcome === "A" ? market.priceABps : market.priceBBps;
  const sharesMilli = useMemo(
    () => Math.round(Math.max(0, Number(shares) || 0) * 1000),
    [shares],
  );

  function changeTicket(nextOutcome?: Outcome, nextAction?: TradeAction) {
    if (nextOutcome) setOutcome(nextOutcome);
    if (nextAction) setAction(nextAction);
    setQuote(null);
    setMessage("");
  }

  async function preview() {
    setLoading(true);
    setMessage("");
    setQuote(null);
    try {
      const response = await fetch(`/api/markets/${market.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, action, sharesMilli }),
      });
      const payload = (await response.json()) as QuoteResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Quote unavailable.");
      setQuote(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Quote unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function placeOrder() {
    if (!quote) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/markets/${market.id}/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          action,
          sharesMilli,
          limitPriceBps:
            action === "buy"
              ? Math.min(10_000, quote.averagePriceBps + 100)
              : Math.max(0, quote.averagePriceBps - 100),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Trade failed.");
      setMessage("Order filled. Your portfolio has been updated.");
      setQuote(null);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trade failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="trade-ticket">
      <div className="ticket-head">
        <div><span>Order ticket</span><strong>{market.status}</strong></div>
        <small>Price {formatPercent(selectedPrice)}</small>
      </div>
      <div className="segmented" aria-label="Trade action">
        <button className={action === "buy" ? "active" : ""} onClick={() => changeTicket(undefined, "buy")}>Buy</button>
        <button className={action === "sell" ? "active" : ""} onClick={() => changeTicket(undefined, "sell")}>Sell</button>
      </div>
      <fieldset className="outcome-options">
        <legend>Choose a winner</legend>
        <button className={outcome === "A" ? "selected blue-choice" : ""} onClick={() => changeTicket("A")}>
          <span>{market.botA.name}</span><strong>{formatPercent(market.priceABps)}</strong>
        </button>
        <button className={outcome === "B" ? "selected red-choice" : ""} onClick={() => changeTicket("B")}>
          <span>{market.botB.name}</span><strong>{formatPercent(market.priceBBps)}</strong>
        </button>
      </fieldset>
      <label className="shares-field">
        <span>Shares</span>
        <input
          aria-label="Number of shares"
          inputMode="decimal"
          min="1"
          max="500"
          onChange={(event) => {
            setShares(event.target.value);
            setQuote(null);
          }}
          step="1"
          type="number"
          value={shares}
        />
        <small>1 share pays 1 CR if correct</small>
      </label>
      {quote ? (
        <div className="quote-box">
          <div><span>{action === "buy" ? "Estimated cost" : "Estimated proceeds"}</span><strong>{formatCredits(Math.abs(quote.costMilli))}</strong></div>
          <div><span>Average price</span><strong>{formatPercent(quote.averagePriceBps)}</strong></div>
          <div><span>Price after</span><strong>{formatPercent(outcome === "A" ? quote.priceABpsAfter : 10_000 - quote.priceABpsAfter)}</strong></div>
        </div>
      ) : null}
      {!signedIn ? (
        <a className="button button-primary button-full" href={signInPath}>Sign in to trade</a>
      ) : quote ? (
        <button className="button button-primary button-full" disabled={loading} onClick={placeOrder}>
          {loading ? "Placing order…" : "Place order"}
        </button>
      ) : (
        <button className="button button-primary button-full" disabled={loading || market.status !== "open" || sharesMilli < 1000 || sharesMilli > 500_000} onClick={preview}>
          {loading ? "Calculating…" : "Preview order"}
        </button>
      )}
      {message ? <p className="ticket-message" role="status">{message}</p> : null}
      <p className="ticket-fineprint">Quotes include up to 1% price movement protection.</p>
    </section>
  );
}
