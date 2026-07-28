import { getMarkets } from "../../../lib/store";

export async function GET() {
  try {
    const markets = await getMarkets();
    return Response.json({ markets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Markets unavailable." },
      { status: 500 },
    );
  }
}
