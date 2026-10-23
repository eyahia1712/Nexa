import { skillLabel } from "@/lib/catalog";
import type { Profile } from "@/lib/profile";
import type { SignalSnapshot } from "@/lib/signals/snapshot";

import { matchRoles } from "./match";
import { BAND_LABEL, allMomentum, type SkillMomentum } from "./momentum";
import { SCENARIOS, SCENARIO_ORDER, type ScenarioId } from "./scenarios";

/**
 * "What changed": run the same engine on two dated snapshots and explain the
 * difference in plain words. This is the automatic re-planning the brief asks
 * for — when the evidence moves, the plan moves, and it says why.
 */

export function momentumFor(snapshot: SignalSnapshot): Record<ScenarioId, Map<string, SkillMomentum>> {
  return Object.fromEntries(SCENARIO_ORDER.map((id) => [id, allMomentum(snapshot, SCENARIOS[id])])) as Record<ScenarioId, Map<string, SkillMomentum>>;
}

export interface SkillChange {
  skillId: string;
  before: number;
  after: number;
  delta: number;
  bandChanged: boolean;
  sentence: string;
}

export function skillChanges(before: SignalSnapshot, after: SignalSnapshot, scenario: ScenarioId): SkillChange[] {
  const a = allMomentum(before, SCENARIOS[scenario]);
  const b = allMomentum(after, SCENARIOS[scenario]);
  const changes: SkillChange[] = [];
  for (const [id, next] of b) {
    const prev = a.get(id);
    if (!prev) continue;
    const delta = next.score - prev.score;
    if (Math.abs(delta) < 3 && prev.band === next.band) continue;
    const growthBefore = prev.researchGrowth;
    const growthAfter = next.researchGrowth;
    const pct = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
    const evidence =
      growthBefore !== null && growthAfter !== null && !after.arxiv.skills[id]!.carriedFrom
        ? ` Research on it, relative to arXiv overall: ${pct(growthBefore)} a year earlier, ${pct(growthAfter)} now (${before.arxiv.skills[id]!.current.toLocaleString()} → ${after.arxiv.skills[id]!.current.toLocaleString()} papers a quarter).`
        : "";
    changes.push({
      skillId: id,
      before: prev.score,
      after: next.score,
      delta,
      bandChanged: prev.band !== next.band,
      sentence: `${skillLabel(id)} ${delta > 0 ? "rose" : "fell"} from ${prev.score} to ${next.score}${prev.band !== next.band ? ` (${BAND_LABEL[prev.band]} → ${BAND_LABEL[next.band]})` : ""}.${evidence}`,
    });
  }
  return changes.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

export interface RoleChange {
  roleId: string;
  label: string;
  rankBefore: number;
  rankAfter: number;
  scoreBefore: number;
  scoreAfter: number;
}

export function roleChanges(profile: Profile, before: SignalSnapshot, after: SignalSnapshot, scenario: ScenarioId): RoleChange[] {
  const a = matchRoles(profile, momentumFor(before), scenario, 0);
  const b = matchRoles(profile, momentumFor(after), scenario, 0);
  const rankA = new Map(a.map((match, index) => [match.role.id, { rank: index + 1, score: match.score }]));
  return b
    .map((match, index) => {
      const prev = rankA.get(match.role.id) ?? { rank: 99, score: 0 };
      return { roleId: match.role.id, label: match.role.label, rankBefore: prev.rank, rankAfter: index + 1, scoreBefore: prev.score, scoreAfter: match.score };
    })
    .filter((change) => change.rankAfter <= 8 && (change.rankBefore !== change.rankAfter || change.scoreBefore !== change.scoreAfter));
}
