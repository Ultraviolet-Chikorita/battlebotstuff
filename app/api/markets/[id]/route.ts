import { getMarketById, getPriceHistory, getRecentTrades } from "../../../../lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const market = await getMarketById(id);
    if (!market) return Response.json({ error: "Market not found." }, { status: 404 });
    const [priceHistory, trades] = await Promise.all([
      getPriceHistory(id),
      getRecentTrades(id),
    ]);
    return Response.json({ market, priceHistory, trades });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Market unavailable." },
      { status: 500 },
    );
  }
}
