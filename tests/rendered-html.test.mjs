import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build contains the Arena Odds application shell", async () => {
  await access(new URL("../dist/server/index.js", import.meta.url));
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Arena Odds|ARENA \/ ODDS/);
  assert.match(page, /Call the fight/);
  assert.match(page, /Play-money only/i);
  assert.match(layout, /Arena Odds — BattleBots Prediction Market/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /--lime:\s*#d9ff43/i);
  assert.doesNotMatch(page + layout + packageJson, /codex-preview|react-loading-skeleton/i);
});
