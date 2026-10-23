import { OCCUPATIONS, SKILLS, type Skill } from "@/lib/catalog";
import type { SignalSnapshot } from "@/lib/signals/snapshot";

import type { Scenario } from "./scenarios";

/**
 * Skill Momentum: one 0–100 number per skill, built from three named pieces
 * of evidence so the "Why?" panel can show exactly where it came from.
 *
 *   50  neutral start
 *   ±   WEF Future of Jobs 2025 direction of the skill cluster
 *   +   AI research momentum: arXiv papers on the skill, year on year,
 *       relative to arXiv as a whole (only for skills with a research query)
 *   −   AI substitution pressure: observed AI exposure (Anthropic Economic
 *       Index) of the routine job the skill mostly belongs to
 */

export type MomentumBand = "rising-fast" | "rising" | "steady" | "declining";

export interface MomentumPart {
  key: "wef" | "research" | "routine";
  label: string;
  points: number;
  detail: string;
  source: string;
}

export interface SkillMomentum {
  skill: Skill;
  score: number;
  band: MomentumBand;
  parts: MomentumPart[];
  /** Relative research growth (e.g. 0.42 = 42% faster than arXiv overall), if measured. */
  researchGrowth: number | null;
}

export const BAND_LABEL: Record<MomentumBand, string> = {
  "rising-fast": "Rising fast",
  rising: "Rising",
  steady: "Steady",
  declining: "Declining",
};

const WEF_POINTS = { rising: 12, stable: 0, declining: -15 } as const;

function band(score: number): MomentumBand {
  if (score >= 68) return "rising-fast";
  if (score >= 56) return "rising";
  if (score >= 44) return "steady";
  return "declining";
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pct = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;

/** Year-on-year growth of a skill's papers, net of arXiv's overall growth. */
export function relativeResearchGrowth(snapshot: SignalSnapshot, skillId: string): number | null {
  const reading = snapshot.arxiv.skills[skillId];
  const total = reading?.total ?? snapshot.arxiv.total;
  if (!reading || reading.previous <= 0 || total.previous <= 0) return null;
  return reading.current / reading.previous / (total.current / total.previous) - 1;
}

export function skillMomentum(skill: Skill, snapshot: SignalSnapshot, scenario: Scenario): SkillMomentum {
  const parts: MomentumPart[] = [];

  const wef = WEF_POINTS[skill.wef];
  parts.push({
    key: "wef",
    label: "Employer outlook",
    points: wef,
    detail:
      skill.wef === "rising"
        ? `“${skill.wefCluster}” is among the fastest-growing skills employers expect to 2030.`
        : skill.wef === "declining"
          ? `${skill.wefCluster}.`
          : `“${skill.wefCluster}” is expected to hold steady.`,
    source: "WEF Future of Jobs Report 2025",
  });

  const growth = relativeResearchGrowth(snapshot, skill.id);
  if (growth !== null) {
    const reading = snapshot.arxiv.skills[skill.id]!;
    // Research momentum moves the score by at most −10 / +22 points.
    const points = Math.round(clamp(growth, -0.5, 1) * 22);
    parts.push({
      key: "research",
      label: "AI research momentum",
      points,
      detail: `${reading.previous.toLocaleString()} → ${reading.current.toLocaleString()} arXiv papers (${snapshot.window.previous.from.slice(0, 7)} vs ${snapshot.window.current.from.slice(0, 7)} quarter), ${pct(growth)} relative to all of arXiv.`,
      source: reading.carriedFrom ? `arXiv API, carried over from the ${reading.carriedFrom} (live query was rate-limited)` : `arXiv API, ${snapshot.label}`,
    });
  }

  if (skill.routineSoc !== null) {
    const occupation = OCCUPATIONS[skill.routineSoc];
    if (occupation) {
      const points = -Math.round(25 * occupation.exposure * scenario.routinePressure);
      parts.push({
        key: "routine",
        label: "AI substitution pressure",
        points,
        detail: `${occupation.title}: ${Math.round(occupation.exposure * 100)}% of task time already covered by observed AI use; scaled for the ${scenario.short.toLowerCase()} scenario.`,
        source: "Anthropic Economic Index (labor market impacts, Mar 2026)",
      });
    }
  }

  // Under fast disruption AI skills themselves are pulled up a little more.
  let scenarioPoints = 0;
  if (skill.category === "AI & data" && skill.wef === "rising") scenarioPoints = Math.round(scenario.aiPull / 2);

  const score = clamp(Math.round(50 + parts.reduce((sum, part) => sum + part.points, 0) + scenarioPoints), 0, 100);
  return { skill, score, band: band(score), parts, researchGrowth: growth };
}

export function allMomentum(snapshot: SignalSnapshot, scenario: Scenario): Map<string, SkillMomentum> {
  return new Map(SKILLS.map((skill) => [skill.id, skillMomentum(skill, snapshot, scenario)]));
}
