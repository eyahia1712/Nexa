/**
 * Builds data/history.json: arXiv paper counts for the same July–September
 * window in every year from 2019, so "What changed" can draw multi-year lines.
 * 2024–2026 are reused from the bundled snapshots; earlier years are fetched.
 *   npx tsx scripts/history-signals.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

import { arxivCount, sleep } from "../lib/signals/fetchers";
import type { SignalSnapshot } from "../lib/signals/snapshot";

const FIRST_YEAR = 2019;
const { snapshots } = JSON.parse(readFileSync("data/signals.json", "utf8")) as {
  snapshots: SignalSnapshot[];
};
const [older, newer] = snapshots as [SignalSnapshot, SignalSnapshot];
const queries = Object.fromEntries(
  Object.entries(older.arxiv.skills).map(([id, reading]) => [
    id,
    reading.query,
  ]),
);

type Year = {
  year: number;
  window: { from: string; to: string };
  total: number;
  skills: Record<string, number>;
};
const years: Year[] = [];
const q3 = (year: number) => ({ from: `${year}-07-01`, to: `${year}-09-30` });

async function count(
  query: string | null,
  window: { from: string; to: string },
) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const value = await arxivCount(query, window);
      await sleep(3_100);
      return value;
    } catch (error) {
      console.warn(
        `retry ${query ?? "total"} ${window.from}: ${(error as Error).message}`,
      );
      await sleep(3_100 * (attempt + 2));
    }
  }
  throw new Error(`failed: ${query ?? "total"} ${window.from}`);
}

for (let year = FIRST_YEAR; year <= 2023; year += 1) {
  const window = q3(year);
  const skills: Record<string, number> = {};
  const total = await count(null, window);
  for (const [id, query] of Object.entries(queries))
    skills[id] = await count(query, window);
  years.push({ year, window, total, skills });
  console.log(year, total);
}
const pick = (snapshot: SignalSnapshot, key: "current" | "previous") =>
  Object.fromEntries(
    Object.entries(snapshot.arxiv.skills).map(([id, reading]) => [
      id,
      reading[key],
    ]),
  );
years.push({
  year: 2024,
  window: older.window.previous,
  total: older.arxiv.total.previous,
  skills: pick(older, "previous"),
});
years.push({
  year: 2025,
  window: older.window.current,
  total: older.arxiv.total.current,
  skills: pick(older, "current"),
});
years.push({
  year: 2026,
  window: newer.window.current,
  total: newer.arxiv.total.current,
  skills: pick(newer, "current"),
});

writeFileSync(
  "data/history.json",
  `${JSON.stringify({ source: "arXiv export API, papers submitted 1 Jul–30 Sep each year", fetchedAt: new Date().toISOString().slice(0, 10), queries, years }, null, 2)}\n`,
);
console.log("wrote data/history.json");
