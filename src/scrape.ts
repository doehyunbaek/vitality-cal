import { chromium } from "playwright";

type LiquipediaMatch = {
  href: string;
  unixTimestamp: number;
  team1: string;
  team2: string;
  score1: string | null;
  score2: string | null;
};

function buildIsoDateFromUnixTimestamp(unixTimestamp: number): string {
  if (!Number.isFinite(unixTimestamp) || unixTimestamp <= 0) return "";

  const date = new Date(unixTimestamp * 1000);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

async function getVitalityMatches(): Promise<UFCEvent[]> {
  const url = "https://liquipedia.net/counterstrike/Team_Vitality";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 900000 });
    await page.waitForSelector(
      ".match-info--vertical, .match-table-wrapper tr.table2__row--body",
      { timeout: 60000 }
    );

    const rawMatches: LiquipediaMatch[] = await page.evaluate(() => {
      const upcomingMatches = Array.from(
        document.querySelectorAll(".match-info--vertical")
      ).map((row) => {
        const unixTimestamp = Number(
          row.querySelector(".timer-object")?.getAttribute("data-timestamp") ||
            "0"
        );

        const teamNames = Array.from(
          row.querySelectorAll(".match-info-opponent-row .block-team .name")
        ).map((nameEl) => nameEl.textContent?.trim() || "");

        const href =
          row
            .querySelector(".match-info-tournament-name a")
            ?.getAttribute("href") || "/counterstrike/Team_Vitality";

        return {
          href,
          unixTimestamp,
          team1: teamNames[0] || "Vitality",
          team2: teamNames[1] || "",
          score1: null,
          score2: null,
        };
      });

      const recentMatches = Array.from(
        document.querySelectorAll(".match-table-wrapper tr.table2__row--body")
      ).map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));

        const unixTimestamp = Number(
          row.querySelector(".timer-object")?.getAttribute("data-timestamp") ||
            "0"
        );

        const team2 =
          cells[8]
            ?.querySelector(".block-team .name a")
            ?.textContent?.trim() || cells[8]?.textContent?.trim() || "";

        const scoreText =
          cells[7]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const scoreMatch = scoreText.match(/(\d+)\s*:\s*(\d+)/);
        const score1 = scoreMatch?.[1] || null;
        const score2 = scoreMatch?.[2] || null;

        const href =
          cells[5]
            ?.querySelector('a[href^="/counterstrike/"]')
            ?.getAttribute("href") ||
          cells[8]
            ?.querySelector('a[href^="/counterstrike/"]')
            ?.getAttribute("href") ||
          "/counterstrike/Team_Vitality";

        return {
          href,
          unixTimestamp,
          team1: "Vitality",
          team2,
          score1,
          score2,
        };
      });

      return [...upcomingMatches, ...recentMatches].filter(
        (match) =>
          Number.isFinite(match.unixTimestamp) &&
          match.unixTimestamp > 0 &&
          Boolean(match.team2)
      );
    });

    const events: UFCEvent[] = rawMatches.map((match) => {
      const isoDate = buildIsoDateFromUnixTimestamp(match.unixTimestamp);

      const result =
        match.score1 !== null && match.score2 !== null
          ? `${match.score1} : ${match.score2}`
          : "TBD";

      const absoluteUrl = new URL(match.href, "https://liquipedia.net");

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
