import historyFile from "@/data/history.json";
import { SKILLS } from "@/lib/catalog";
import type { Profile } from "@/lib/profile";
import type { SignalSnapshot } from "@/lib/signals/snapshot";

import { momentumFor } from "./changes";
import { matchRoles } from "./match";
import { allMomentum } from "./momentum";
import { SCENARIOS, type ScenarioId } from "./scenarios";

/**
 * Year-by-year history for "What changed". data/history.json holds real arXiv
 * counts for July–September of every year since 2019. Each year becomes a
 * snapshot (that year vs the year before), and the same engine scores it, so
 * every point on the chart is computed exactly like today's numbers.
 */

interface HistoryYear {
  year: number;
  window: { from: string; to: string };
  total: number;
  skills: Record<string, number>;
}

const HISTORY = historyFile as {
  source: string;
  fetchedAt: string;
  queries: Record<string, string>;
  years: HistoryYear[];
};
export const HISTORY_SOURCE = HISTORY.source;

/** "23 Oct" — how a live reading is labelled on the time axis. */
export function shortDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export interface TimePoint {
  label: string;
  snapshot: SignalSnapshot;
}

/** One snapshot per year from the second year on, plus a live reading if there is one. */
export function yearlyPoints(live: SignalSnapshot | null): TimePoint[] {
  const years = [...HISTORY.years].sort((a, b) => a.year - b.year);
  const points: TimePoint[] = [];
  for (let index = 1; index < years.length; index += 1) {
    const current = years[index]!;
    const previous = years[index - 1]!;
    points.push({
      label: String(current.year),
      snapshot: {
        id: `history-${current.year}`,
        label: `${current.year}`,
        kind: "bundled",
        asOf: current.window.to,
        fetchedAt: HISTORY.fetchedAt,
        window: { current: current.window, previous: previous.window },
        arxiv: {
          total: { current: current.total, previous: previous.total },
          skills: Object.fromEntries(
            Object.entries(HISTORY.queries).map(([id, query]) => [
              id,
              {
                query,
                current: current.skills[id] ?? 0,
                previous: previous.skills[id] ?? 0,
              },
            ]),
          ),
        },
        labour: null,
        errors: [],
      },
    });
  }
  if (live) points.push({ label: shortDay(live.asOf), snapshot: live });
  return points;
}

export interface Line {
  id: string;
  label: string;
  values: (number | null)[];
  mine?: boolean;
}

/** Momentum (0–100) of every skill at every point. */
export function momentumLines(
  points: TimePoint[],
  scenario: ScenarioId,
  mine: Set<string>,
): Line[] {
  const maps = points.map((point) =>
    allMomentum(point.snapshot, SCENARIOS[scenario]),
  );
  return SKILLS.map((skill) => ({
    id: skill.id,
    label: skill.label,
    mine: mine.has(skill.id),
    values: maps.map((map) => map.get(skill.id)?.score ?? null),
  }));
}

/** Papers per 10,000 arXiv papers, for the skills arXiv can measure. Starts a year earlier. */
export function researchLines(
  live: SignalSnapshot | null,
  mine: Set<string>,
): { labels: string[]; lines: Line[] } {
  const years = [...HISTORY.years].sort((a, b) => a.year - b.year);
  const labels = [
    ...years.map((year) => String(year.year)),
    ...(live ? [shortDay(live.asOf)] : []),
  ];
  const lines = Object.keys(HISTORY.queries).map((id) => {
    const values = years.map((year) =>
      year.total > 0 ? ((year.skills[id] ?? 0) / year.total) * 10_000 : null,
    );
    if (live) {
      const reading = live.arxiv.skills[id];
      const total = reading?.total ?? live.arxiv.total;
      values.push(
        reading && total.current > 0
          ? (reading.current / total.current) * 10_000
          : null,
      );
    }
    return {
      id,
      label: SKILLS.find((skill) => skill.id === id)?.label ?? id,
      mine: mine.has(id),
      values,
    };
  });
  return { labels, lines };
}

/** Fit score (0–100) of the person's top roles at every point. */
export function roleLines(
  profile: Profile,
  points: TimePoint[],
  scenario: ScenarioId,
  count = 6,
): Line[] {
  const scored = points.map(
    (point) =>
      new Map(
        matchRoles(profile, momentumFor(point.snapshot), scenario, 0).map(
          (match) => [match.role.id, match],
        ),
      ),
  );
  const latest = [...scored[scored.length - 1]!.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  return latest.map((match) => ({
    id: match.role.id,
    label: match.role.label,
    values: scored.map((map) => map.get(match.role.id)?.score ?? null),
  }));
}
