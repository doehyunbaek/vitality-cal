import { parse, HTMLElement } from "node-html-parser";
import { decode } from "html-entities";



async function getVitalityMatches(): Promise<UFCEvent[]> {
  const url = new URL("https://www.hltv.org/team/9565/vitality#tab-matchesBox");

  try {
    const response = await fetch(url);
    const text = await response.text();
    const root = parse(text);

    const matchesBox = root.querySelector("#matchesBox");
    if (!matchesBox) throw new Error("Could not find matchesBox");

    // Find all match tables (upcoming and recent)
    const matchTables = matchesBox.querySelectorAll(".match-table");
    const matches: UFCEvent[] = [];

    matchTables.forEach((table) => {
      // Find the event name from the previous .event-header-cell
      let eventName = "";
      let prev = table;
      while (prev && prev.previousElementSibling) {
        prev = prev.previousElementSibling;
        if (
          prev.tagName === "THEAD" &&
          prev.querySelector(".event-header-cell")
        ) {
          eventName =
            prev.querySelector(".event-header-cell a")?.textContent?.trim() ||
            "";
          break;
        }
      }

      // For each match row
      table.querySelectorAll("tr.team-row").forEach((row) => {
        // Date
        const dateUnix = row
          .querySelector(".date-cell span")
          ?.getAttribute("data-unix");
        const date = dateUnix ? new Date(Number(dateUnix)).toISOString() : "";

        // Teams
        const team1 =
          row.querySelector(".team-name.team-1")?.textContent?.trim() || "";
        const team2 =
          row.querySelector(".team-name.team-2")?.textContent?.trim() || "";

        // Score/result
        const scores = row.querySelectorAll(".score");
        const score1 = scores[0]?.textContent?.trim() || "-";
        const score2 = scores[1]?.textContent?.trim() || "-";
        const result =
          score1 !== "-" && score2 !== "-"
            ? `${score1} : ${score2}`
            : "TBD";

        // Match link
        const matchLink =
          row.querySelector("a.matchpage-button, a.stats-button")?.getAttribute("href") || "";
        const matchUrl = matchLink
          ? `https://www.hltv.org${matchLink}`
          : url.href;

        matches.push({
          name: `${team1} vs. ${team2}`,
          url: new URL(matchUrl),
          date,
          location: "",
          fightCard: [`Result: ${result}`],
          mainCard: [],
          prelims: [],
          earlyPrelims: [],
          prelimsTime: undefined,
          earlyPrelimsTime: undefined,
        });
      });
    });

    return matches;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve Vitality matches");
  }
}

export { getVitalityMatches };
