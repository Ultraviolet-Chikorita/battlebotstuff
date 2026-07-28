import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { fetchYouTubeEvidence } from "../../../../../../lib/bright-data";
import {
  isAdminEmail,
  resolveMarket,
} from "../../../../../../lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getChatGPTUser();
    if (!user || !isAdminEmail(user.email)) {
      return Response.json({ error: "Administrator access required." }, { status: 403 });
    }
    const { id } = await params;
    const payload = (await request.json()) as {
      outcome?: "A" | "B" | "VOID";
      evidenceUrl?: string;
    };
    if (!["A", "B", "VOID"].includes(payload.outcome ?? "")) {
      return Response.json({ error: "Choose A, B, or VOID." }, { status: 400 });
    }
    const evidenceUrl = payload.evidenceUrl?.trim() ?? "";
    const url = new URL(evidenceUrl);
    if (url.protocol !== "https:") {
      return Response.json({ error: "Evidence must use HTTPS." }, { status: 400 });
    }
    const evidence = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(url.hostname)
      ? await fetchYouTubeEvidence(evidenceUrl)
      : { title: null, excerpt: null };
    const result = await resolveMarket(user, id, payload.outcome!, {
      url: evidenceUrl,
      ...evidence,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Resolution failed." },
      { status: 409 },
    );
  }
}
