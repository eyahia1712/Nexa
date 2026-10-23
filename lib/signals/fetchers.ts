/**
 * Live trend sources. Both are public, keyless APIs:
 *  - arXiv export API: how many AI/tech papers mention a skill in a date
 *    window, a proxy for how fast that capability is advancing.
 *  - OpenDOSM (api.data.gov.my): Malaysia's monthly labour force survey.
 *
 * Used by scripts/snapshot-signals.ts (to ship dated snapshots with the app)
 * and by /api/signals (the "Refresh signals" button).
 */

const ARXIV = "https://export.arxiv.org/api/query";
const DOSM = "https://api.data.gov.my/data-catalogue";

export interface DateWindow {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const compact = (day: string) => day.replaceAll("-", "");

/** Number of arXiv papers matching `query` submitted inside the window. */
export async function arxivCount(query: string | null, window: DateWindow, timeoutMs = 20_000): Promise<number> {
  const range = `submittedDate:[${compact(window.from)}0000 TO ${compact(window.to)}2359]`;
  const search = query === null ? range : `(${query}) AND ${range}`;
  // max_results=0 is rejected by the API; one result is the cheapest valid call.
  const url = `${ARXIV}?search_query=${encodeURIComponent(search)}&max_results=1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "User-Agent": "Nexa/0.1 (SDC Hackathon 2026; trend signals)" } });
  if (!response.ok) throw new Error(`arXiv ${response.status}`);
  const body = await response.text();
  const match = /<opensearch:totalResults[^>]*>(\d+)</.exec(body);
  if (match?.[1] === undefined) throw new Error("arXiv: no totalResults in response");
  return Number(match[1]);
}

export interface LabourMonth {
  date: string;
  labourForce: number; // thousands
  employed: number; // thousands
  unemployed: number; // thousands
  unemploymentRate: number; // %
  participationRate: number; // %
}

/** The latest `months` rows of Malaysia's monthly labour force survey. */
export async function dosmLabour(months = 13, timeoutMs = 20_000): Promise<LabourMonth[]> {
  const url = `${DOSM}?id=lfs_month&sort=-date&limit=${months}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`OpenDOSM ${response.status}`);
  const rows = (await response.json()) as Array<Record<string, number | string>>;
  return rows.map((row) => ({
    date: String(row.date),
    labourForce: Number(row.lf),
    employed: Number(row.lf_employed),
    unemployed: Number(row.lf_unemployed),
    unemploymentRate: Number(row.u_rate),
    participationRate: Number(row.p_rate),
  }));
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
