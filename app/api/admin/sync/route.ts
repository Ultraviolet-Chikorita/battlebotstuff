import { getChatGPTUser } from "../../../chatgpt-auth";
import { fetchEpisodeCard } from "../../../../lib/bright-data";
import {
  isAdminEmail,
  recordSync,
  syncEpisode,
} from "../../../../lib/store";

export async function POST(request: Request) {
  const syncId = crypto.randomUUID();
  let sourceUrl = "";
  try {
    const user = await getChatGPTUser();
    if (!user || !isAdminEmail(user.email)) {
      return Response.json({ error: "Administrator access required." }, { status: 403 });
    }
    const payload = (await request.json()) as { sourceUrl?: string };
    sourceUrl = payload.sourceUrl?.trim() ?? "";
    const parsedUrl = new URL(sourceUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      !/(^|\.)battlebots\.com$/i.test(parsedUrl.hostname)
    ) {
      return Response.json(
        { error: "Use an official HTTPS BattleBots episode URL." },
        { status: 400 },
      );
    }
    await recordSync({ id: syncId, sourceUrl, status: "running" });
    const episode = await fetchEpisodeCard(sourceUrl);
    const sourceHash = await sha256(episode.html);
    const result = await syncEpisode(episode, sourceUrl, sourceHash);
    await recordSync({
      id: syncId,
      sourceUrl,
      status: "success",
      message: `Episode ${episode.episodeNumber} synchronized.`,
      marketsFound: result.marketsFound,
      complete: true,
    });
    return Response.json({ episode, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    if (sourceUrl) {
      await recordSync({
        id: syncId,
        sourceUrl,
        status: "failed",
        message,
        complete: true,
      }).catch(() => undefined);
    }
    return Response.json({ error: message }, { status: 502 });
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
