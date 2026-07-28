import { getChatGPTUser } from "../../../../chatgpt-auth";
import type { Outcome, TradeAction } from "../../../../../lib/market-engine";
import { executeTrade } from "../../../../../lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in to trade." }, { status: 401 });
    const { id } = await params;
    const payload = (await request.json()) as {
      outcome?: Outcome;
      action?: TradeAction;
      sharesMilli?: number;
      limitPriceBps?: number;
      idempotencyKey?: string;
    };
    if (
      !payload.idempotencyKey ||
      payload.idempotencyKey.length < 8 ||
      payload.idempotencyKey.length > 100
    ) {
      return Response.json({ error: "Invalid order identifier." }, { status: 400 });
    }
    if (!["A", "B"].includes(payload.outcome ?? "")) {
      return Response.json({ error: "Choose a valid outcome." }, { status: 400 });
    }
    if (!["buy", "sell"].includes(payload.action ?? "")) {
      return Response.json({ error: "Choose buy or sell." }, { status: 400 });
    }
    if (
      !Number.isSafeInteger(payload.sharesMilli) ||
      (payload.sharesMilli ?? 0) < 1000 ||
      (payload.sharesMilli ?? 0) > 500_000 ||
      !Number.isSafeInteger(payload.limitPriceBps) ||
      (payload.limitPriceBps ?? -1) < 0 ||
      (payload.limitPriceBps ?? 10_001) > 10_000
    ) {
      return Response.json({ error: "Invalid order size or price limit." }, { status: 400 });
    }
    const result = await executeTrade(user, {
      idempotencyKey: payload.idempotencyKey,
      marketId: id,
      outcome: payload.outcome as Outcome,
      action: payload.action as TradeAction,
      sharesMilli: payload.sharesMilli as number,
      limitPriceBps: payload.limitPriceBps as number,
    });
    return Response.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trade failed.";
    return Response.json({ error: message }, { status: 409 });
  }
}
