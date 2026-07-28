import assert from "node:assert/strict";
import test from "node:test";
import {
  eloProbability,
  priceA,
  quoteTrade,
  seedQuantities,
  settlePayoutMilli,
} from "../lib/market-engine.ts";
import { parseEpisodeCard, slugify } from "../lib/battlebots-parser.ts";

test("LMSR prices remain complementary and rise after a buy", () => {
  const state = { qAMilli: 0, qBMilli: 0, liquidityMilli: 2_500_000 };
  const quote = quoteTrade(state, "A", "buy", 100_000);
  assert.equal(priceA(state), 0.5);
  assert.ok(quote.priceABpsAfter > 5000);
  assert.ok(quote.costMilli > 0);
  assert.ok(quote.averagePriceBps > 5000);
});

test("selling reverses a prior buy within rounding tolerance", () => {
  const state = { qAMilli: 0, qBMilli: 0, liquidityMilli: 2_500_000 };
  const buy = quoteTrade(state, "A", "buy", 100_000);
  const next = { ...state, qAMilli: 100_000 };
  const sell = quoteTrade(next, "A", "sell", 100_000);
  assert.ok(Math.abs(buy.costMilli + sell.costMilli) <= 1);
});

test("Elo seeds are clipped and settle rules are deterministic", () => {
  assert.equal(eloProbability(3000, 1000), 0.8);
  assert.equal(eloProbability(1000, 3000), 0.2);
  const quantities = seedQuantities(8000);
  assert.ok(quantities.qAMilli > 0);
  assert.equal(settlePayoutMilli("A", 4000, 1000), 4000);
  assert.equal(settlePayoutMilli("B", 4000, 1000), 1000);
  assert.equal(settlePayoutMilli("VOID", 4000, 1000), 2500);
});

test("BattleBots episode parser extracts and normalizes a fight card", () => {
  const html = `
    <h1>BattleBots Pro League Episode 106</h1>
    <time datetime="2026-08-06T13:00:00-07:00"></time>
    <table><tr><th>Group</th><th>Blue Square Bot</th><th>Red Square Bot</th></tr>
    <tr><td>F</td><td>Ribbot</td><td>Witch Doctor</td></tr>
    <tr><td>E</td><td>HUGE</td><td>Minotaur</td></tr></table>`;
  const parsed = parseEpisodeCard(html);
  assert.equal(parsed.episodeNumber, "106");
  assert.equal(parsed.fights.length, 2);
  assert.deepEqual(parsed.fights[0], {
    group: "F",
    botA: "Ribbot",
    botB: "Witch Doctor",
  });
  assert.equal(slugify("Witch Doctor!"), "witch-doctor");
});
