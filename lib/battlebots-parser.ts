export type ParsedFight = {
  group: string;
  botA: string;
  botB: string;
};

export type ParsedEpisode = {
  episodeNumber: string;
  title: string;
  scheduledAt: string;
  fights: ParsedFight[];
};

const entities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
}

export function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseEpisodeCard(html: string): ParsedEpisode {
  const titleMatch = html.match(
    /BattleBots\s+Pro\s+League\s+Episode\s+([A-Za-z0-9-]+)/i,
  );
  if (!titleMatch) throw new Error("Episode number was not found.");

  const episodeNumber = titleMatch[1];
  const fights: ParsedFight[] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of html.matchAll(rowPattern)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (cell) => stripTags(cell[1]),
    );
    if (
      cells.length >= 3 &&
      !/group/i.test(cells[0]) &&
      cells[1] &&
      cells[2]
    ) {
      fights.push({ group: cells[0], botA: cells[1], botB: cells[2] });
    }
  }

  if (fights.length === 0) throw new Error("No fight-card rows were found.");

  const datetimeMatch = html.match(
    /<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i,
  );
  const dateTextMatch = stripTags(html).match(
    /Episode\s+[A-Za-z0-9-]+\s+[–-]\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i,
  );
  const scheduledAt = datetimeMatch
    ? new Date(datetimeMatch[1]).toISOString()
    : dateTextMatch
      ? new Date(`${dateTextMatch[1]} 13:00:00 GMT-0700`).toISOString()
      : new Date(Date.now() + 7 * 86_400_000).toISOString();

  return {
    episodeNumber,
    title: `Pro League Episode ${episodeNumber}`,
    scheduledAt,
    fights: fights.slice(0, 12),
  };
}
