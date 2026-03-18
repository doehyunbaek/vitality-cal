import { chromium } from "playwright";

type Bo3MatchLink = {
  href: string;
  time: string;
  team1: string;
  team2: string;
  score1: string | null;
  score2: string | null;
};

function buildIsoDateFromHrefAndTime(href: string, time: string): string {
  try {
    const path = href.split("?")[0];
    const segments = path.split("/");
    const slugWithDate = segments[2]; // /matches/<slug-with-date>[/map]
    if (!slugWithDate) return "";

    const baseSlug = slugWithDate.split("/")[0];
    const parts = baseSlug.split("-");
    if (parts.length < 3) return "";

    const day = parts[parts.length - 3];
    const month = parts[parts.length - 2];
    const year = parts[parts.length - 1];

    const [hoursStr, minutesStr] = time.split(":");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hoursStr),
      Number(minutesStr)
    );

    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}

async function getVitalityMatches(): Promise<UFCEvent[]> {
  const url = "https://bo3.gg/teams/vitality/matches";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Give the client-side app a moment to render the matches table
    await page.waitForTimeout(3000);

    const rawMatches: Bo3MatchLink[] = await page.$$eval(
      'a[href^="/matches/"]',
      (links) => {
        const pattern = /-\d{2}-\d{2}-\d{4}(?:\b|\/)/;

        return (links as any[])
          .map((a) => {
            const href = (a as any).getAttribute("href") || "";
            const timeEl = (a as any).querySelector(".time");
            const time = timeEl?.textContent?.trim() || "";

            const teamEls = Array.from(
              (a as any).querySelectorAll(".c-match__team .team-name")
            ) as any[];

            const team1 = teamEls[0]?.textContent?.trim() || "";
            const team2 = teamEls[1]?.textContent?.trim() || "";

            const score1El = (a as any).querySelector(
              ".c-match-score .score-1"
            );
            const score2El = (a as any).querySelector(
              ".c-match-score .score-2"
            );

            const score1 = score1El?.textContent?.trim() || null;
            const score2 = score2El?.textContent?.trim() || null;

            return { href, time, team1, team2, score1, score2 };
          })
          .filter((m) => pattern.test(m.href));
      }
    );

    const events: UFCEvent[] = rawMatches.map((match) => {
      const isoDate = buildIsoDateFromHrefAndTime(match.href, match.time);

      const result =
        match.score1 !== null && match.score2 !== null
          ? `${match.score1} : ${match.score2}`
          : "TBD";

      const absoluteUrl = new URL(match.href, "https://bo3.gg");

      return {
        name: `${match.team1 || "TBD"} vs. ${match.team2 || "TBD"}`,
        url: absoluteUrl,
        date: isoDate,
        location: "",
        fightCard: [`Result: ${result}`],
        mainCard: [],
        prelims: [],
        earlyPrelims: [],
        prelimsTime: undefined,
        earlyPrelimsTime: undefined,
      };
    });

    return events;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve Vitality matches");
  } finally {
    await browser.close();
  }
}

export { getVitalityMatches };
