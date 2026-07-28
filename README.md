# Arena Odds

Arena Odds is an unofficial, play-money prediction market for BattleBots Pro
League fights. Upcoming cards and result evidence are collected from public
BattleBots and YouTube pages through Bright Data.

## Local development

```bash
npm install
npm run dev
```

The app uses the `DB` D1 binding declared in `.openai/hosting.json`. Copy
`.env.example` to `.env.local` to configure Bright Data and administrator
access.

## Runtime settings

- `BRIGHT_DATA_API_KEY`: secret Bright Data API key.
- `BRIGHT_DATA_WEB_UNLOCKER_ZONE`: Web Unlocker zone used for BattleBots pages.
- `ADMIN_EMAILS`: comma-separated ChatGPT account emails allowed to sync and
  resolve markets.
- `LOCAL_DEV_AUTH` and `LOCAL_DEV_EMAIL`: optional localhost-only identity
  fallback for development. Keep `LOCAL_DEV_AUTH` disabled in production.

## Validation

```bash
npm test
npm run db:generate
```

Virtual credits have no cash value. BattleBots® is a trademark of BattleBots,
Inc.; Arena Odds is not affiliated with or endorsed by BattleBots.
