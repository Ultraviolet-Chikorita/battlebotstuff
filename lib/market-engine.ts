export type Outcome = "A" | "B";
export type TradeAction = "buy" | "sell";

export type MarketState = {
  qAMilli: number;
  qBMilli: number;
  liquidityMilli: number;
};

export type Quote = {
  costMilli: number;
  averagePriceBps: number;
  priceABpsBefore: number;
  priceABpsAfter: number;
};

const safeExp = (value: number) => Math.exp(Math.max(-50, Math.min(50, value)));

export function priceA(state: MarketState): number {
  const a = safeExp(state.qAMilli / state.liquidityMilli);
  const b = safeExp(state.qBMilli / state.liquidityMilli);
  return a / (a + b);
}

export function lmsrCost(state: MarketState): number {
  const high = Math.max(state.qAMilli, state.qBMilli);
  const normalizedA = (state.qAMilli - high) / state.liquidityMilli;
  const normalizedB = (state.qBMilli - high) / state.liquidityMilli;
  return (
    high +
    state.liquidityMilli *
      Math.log(safeExp(normalizedA) + safeExp(normalizedB))
  );
}

export function quoteTrade(
  state: MarketState,
  outcome: Outcome,
  action: TradeAction,
  sharesMilli: number,
): Quote {
  if (!Number.isSafeInteger(sharesMilli) || sharesMilli <= 0) {
    throw new Error("Shares must be a positive integer.");
  }

  const direction = action === "buy" ? 1 : -1;
  const next: MarketState = {
    ...state,
    qAMilli:
      state.qAMilli + (outcome === "A" ? direction * sharesMilli : 0),
    qBMilli:
      state.qBMilli + (outcome === "B" ? direction * sharesMilli : 0),
  };
  const rawCost = lmsrCost(next) - lmsrCost(state);
  const costMilli = rawCost >= 0 ? Math.ceil(rawCost) : Math.floor(rawCost);
  const averagePriceBps = Math.round(
    (Math.abs(costMilli) / sharesMilli) * 10_000,
  );

  return {
    costMilli,
    averagePriceBps,
    priceABpsBefore: Math.round(priceA(state) * 10_000),
    priceABpsAfter: Math.round(priceA(next) * 10_000),
  };
}

export function seedQuantities(
  priceABps: number,
  liquidityMilli = 2_500_000,
): Pick<MarketState, "qAMilli" | "qBMilli"> {
  const clipped = Math.max(2000, Math.min(8000, priceABps)) / 10_000;
  return {
    qAMilli: Math.round(liquidityMilli * Math.log(clipped / (1 - clipped))),
    qBMilli: 0,
  };
}

export function eloProbability(eloA: number, eloB: number): number {
  const probability = 1 / (1 + 10 ** ((eloB - eloA) / 400));
  return Math.max(0.2, Math.min(0.8, probability));
}

export function settlePayoutMilli(
  outcome: "A" | "B" | "VOID",
  sharesAMilli: number,
  sharesBMilli: number,
): number {
  if (outcome === "A") return sharesAMilli;
  if (outcome === "B") return sharesBMilli;
  return Math.floor((sharesAMilli + sharesBMilli) / 2);
}
