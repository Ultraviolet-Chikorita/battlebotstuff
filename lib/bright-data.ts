import { env } from "cloudflare:workers";
import { parseEpisodeCard } from "./battlebots-parser";

type RuntimeEnv = {
  BRIGHT_DATA_API_KEY?: string;
  BRIGHT_DATA_WEB_UNLOCKER_ZONE?: string;
};

function runtime(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

export function brightDataConfigured(): boolean {
  return Boolean(
    runtime().BRIGHT_DATA_API_KEY &&
      runtime().BRIGHT_DATA_WEB_UNLOCKER_ZONE,
  );
}

export async function fetchEpisodeCard(sourceUrl: string) {
  const { BRIGHT_DATA_API_KEY, BRIGHT_DATA_WEB_UNLOCKER_ZONE } = runtime();
  if (!BRIGHT_DATA_API_KEY || !BRIGHT_DATA_WEB_UNLOCKER_ZONE) {
    throw new Error(
      "Bright Data is not configured. Add BRIGHT_DATA_API_KEY and BRIGHT_DATA_WEB_UNLOCKER_ZONE.",
    );
  }

  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: BRIGHT_DATA_WEB_UNLOCKER_ZONE,
      url: sourceUrl,
      format: "raw",
    }),
  });

  if (!response.ok) {
    throw new Error(`Bright Data Web Unlocker returned ${response.status}.`);
  }

  const html = await response.text();
  return { ...parseEpisodeCard(html), html };
}

export async function fetchYouTubeEvidence(videoUrl: string): Promise<{
  title: string | null;
  excerpt: string | null;
}> {
  const { BRIGHT_DATA_API_KEY } = runtime();
  if (!BRIGHT_DATA_API_KEY) {
    return { title: null, excerpt: null };
  }

  const endpoint =
    "https://api.brightdata.com/datasets/v3/scrape" +
    "?dataset_id=gd_lk56epmy2i5g7lzu0k&format=json";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ url: videoUrl }]),
  });
  if (!response.ok) {
    throw new Error(`Bright Data YouTube Scraper returned ${response.status}.`);
  }
  const payload = (await response.json()) as Array<{
    title?: string;
    transcript?: string;
    description?: string;
  }>;
  const record = payload[0] ?? {};
  const evidence = record.transcript ?? record.description ?? null;
  return {
    title: record.title ?? null,
    excerpt: evidence?.slice(0, 1200) ?? null,
  };
}
