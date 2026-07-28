import { getChatGPTUser } from "../../../chatgpt-auth";
import { getPortfolio } from "../../../../lib/store";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
    return Response.json(await getPortfolio(user));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Portfolio unavailable." },
      { status: 500 },
    );
  }
}
