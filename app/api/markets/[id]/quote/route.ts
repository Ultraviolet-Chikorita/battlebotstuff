import { createQuote } from "../../../../../lib/store";
import type { Outcome, TradeAction } from "../../../../../lib/market-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as {
      outcome?: Outcome;
      action?: TradeAction;
      sharesMilli?: number;
    };
    if (!["A", "B"].includes(payload.outcome ?? "")) {
      return Response.json({ error: "Choose a valid outcome." }, { status: 400 });
    }
    if (!["buy", "sell"].includes(payload.action ?? "")) {
      return Response.json({ error: "Choose buy or sell." }, { status: 400 });
    }
    if (
      !Number.isSafeInteger(payload.sharesMilli) ||
      (payload.sharesMilli ?? 0) < 1000 ||
      (payload.sharesMilli ?? 0) > 500_000
    ) {
      return Response.json(
        { error: "Enter between 1 and 500 shares." },
        { status: 400 },
      );
    }
    const quote = await createQuote(
      id,
      payload.outcome as Outcome,
      payload.action as TradeAction,
      payload.sharesMilli as number,
    );
    return Response.json(quote);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Quote unavailable." },
      { status: 409 },
    );
  }
}
