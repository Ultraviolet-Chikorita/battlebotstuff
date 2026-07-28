export function formatCredits(valueMilli: number): string {
  return `${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(valueMilli / 1000)} CR`;
}

export function formatPercent(valueBps: number): string {
  return `${(valueBps / 100).toFixed(1)}%`;
}

export function formatShares(valueMilli: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(valueMilli / 1000);
}
