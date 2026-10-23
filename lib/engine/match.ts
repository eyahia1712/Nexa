import { OCCUPATIONS, ROLES, SKILL_BY_ID, goalOf, type Role } from "@/lib/catalog";
import type { Profile, SkillLevel } from "@/lib/profile";

import { hoursForSkill } from "./courses";
import type { SkillMomentum } from "./momentum";
import { SCENARIOS, SCENARIO_ORDER, taskShift, type Scenario, type ScenarioId } from "./scenarios";

/**
 * Future-role matching. The score is three visible parts that add up to the
 * total, so a user (or a judge) can check it by hand:
 *
 *   Skills you have     up to 60 points  weighted share of the role's skills you already hold
 *   Transferable        up to 15 points  missing skills you have a close neighbour for
 *   Future demand       up to 25 points  the role's outlook in the chosen scenario
 *   Entry barrier       −8 or −15        a degree (−8) or a licence (−15) usually needed,
 *                                        unless the person already works in that occupation
 *
 * Age, gender and background are never inputs.
 */

export const BARRIER_POINTS = { open: 0, degree: -8, licence: -15 } as const;

/** A role needs "working" level (2). Basic counts for half. */
const have = (level: SkillLevel | undefined) => (level === undefined ? 0 : Math.min(level / 2, 1));
const TRANSFER_CREDIT = 0.4;

export interface GapItem {
  skillId: string;
  weight: number;
  core: boolean;
  /** 0–1: how much of the needed level the person already has. */
  have: number;
  /** A skill the person already has that transfers into this one. */
  bridge: string | null;
}

export interface Demand {
  score: number;
  parts: { label: string; points: number }[];
}

export interface RoleMatch {
  role: Role;
  score: number;
  points: { skills: number; transfer: number; demand: number; barrier: number };
  coverage: number;
  demand: Demand;
  gaps: GapItem[];
  strengths: string[];
  /** Estimated learning hours to close every gap (from the course catalogue). */
  hoursToReady: number;
  weeksToReady: number;
  roleShift: number;
  sdgGoals: number[];
  /** Matches the person's SDG priorities (goal numbers). */
  sdgOverlap: number[];
  impactScore: number;
  robust: boolean;
  rankByScenario: Record<ScenarioId, number>;
}

function bridgeFor(skillId: string, skills: Profile["skills"]): string | null {
  const target = SKILL_BY_ID.get(skillId);
  if (!target) return null;
  for (const [id, level] of Object.entries(skills)) {
    if (level < 2) continue;
    const owned = SKILL_BY_ID.get(id);
    if (target.related.includes(id) || owned?.related.includes(skillId)) return id;
  }
  return null;
}

export function roleDemand(role: Role, momentum: Map<string, SkillMomentum>, scenario: Scenario): Demand {
  const parts: Demand["parts"] = [];
  const base = role.outlook.direction === "growing" ? 58 + role.outlook.strength * 8 : role.outlook.direction === "steady" ? 50 : 35;
  parts.push({ label: role.outlook.direction === "growing" ? "Growing in our sources" : role.outlook.direction === "steady" ? "No growth signal in our sources" : "Declining in our sources", points: base });

  const core = role.skills.filter((skill) => skill.w >= 2);
  const avg = core.reduce((sum, skill) => sum + (momentum.get(skill.id)?.score ?? 50), 0) / Math.max(1, core.length);
  parts.push({ label: "Momentum of its key skills", points: Math.round((avg - 50) * 0.4) });

  const occupation = OCCUPATIONS[role.soc];
  if (occupation) {
    const pull = Math.round(role.aiAffinity * scenario.aiPull);
    const penalty = -Math.round(occupation.exposure * (1 - role.aiAffinity) * scenario.exposurePenalty);
    if (pull !== 0) parts.push({ label: "Demand from AI adoption", points: pull });
    if (penalty !== 0) parts.push({ label: "Tasks AI absorbs in this role", points: penalty });
  }
  const score = Math.max(0, Math.min(100, parts.reduce((sum, part) => sum + part.points, 0)));
  return { score, parts };
}

function scoreRole(role: Role, profile: Profile, momentum: Map<string, SkillMomentum>, scenario: Scenario) {
  const total = role.skills.reduce((sum, skill) => sum + skill.w, 0);
  let owned = 0;
  let transfer = 0;
  const gaps: GapItem[] = [];
  const strengths: string[] = [];
  for (const need of role.skills) {
    const share = have(profile.skills[need.id]);
    owned += need.w * share;
    if (share >= 1) {
      strengths.push(need.id);
      continue;
    }
    const bridge = bridgeFor(need.id, profile.skills);
    if (bridge !== null) transfer += need.w * (1 - share) * TRANSFER_CREDIT;
    gaps.push({ skillId: need.id, weight: need.w, core: need.core === true, have: share, bridge });
  }
  const coverage = owned / total;
  const transferShare = transfer / total;
  const demand = roleDemand(role, momentum, scenario);
  const points = {
    skills: Math.round(60 * coverage),
    transfer: Math.round((15 * transferShare) / TRANSFER_CREDIT),
    demand: Math.round(25 * (demand.score / 100)),
    barrier: profile.currentSoc === role.soc ? 0 : BARRIER_POINTS[role.entry.barrier],
  };
  gaps.sort((a, b) => Number(b.core) - Number(a.core) || b.weight - a.weight);
  const score = Math.max(0, points.skills + points.transfer + points.demand + points.barrier);
  return { coverage, points, score, demand, gaps, strengths };
}

/**
 * Rank every role in the catalogue for a profile. `sdgWeight` (0–1) is how
 * much the person lets their SDG priorities move the ranking (Impact Compass).
 */
export function matchRoles(
  profile: Profile,
  momentumByScenario: Record<ScenarioId, Map<string, SkillMomentum>>,
  scenarioId: ScenarioId,
  sdgWeight: number,
  options: { orgOnly?: boolean } = {},
): RoleMatch[] {
  const currentOccupation = OCCUPATIONS[profile.currentSoc];
  const roles = options.orgOnly ? ROLES.filter((role) => role.orgMobility) : ROLES;

  const ranks = {} as Record<ScenarioId, Map<string, number>>;
  for (const id of SCENARIO_ORDER) {
    const scored = roles
      .map((role) => ({ id: role.id, score: scoreRole(role, profile, momentumByScenario[id], SCENARIOS[id]).score }))
      .sort((a, b) => b.score - a.score);
    ranks[id] = new Map(scored.map((entry, index) => [entry.id, index + 1]));
  }

  const scenario = SCENARIOS[scenarioId];
  const momentum = momentumByScenario[scenarioId];
  const results = roles.map((role): RoleMatch => {
    const scored = scoreRole(role, profile, momentum, scenario);
    // Ready = the essential and important skills closed; "helpful" ones are extras.
    const hoursToReady = scored.gaps.filter((gap) => gap.core || gap.weight >= 2).reduce((sum, gap) => sum + hoursForSkill(gap.skillId, gap.have), 0);
    const goals = [...new Set(role.sdg.map((tag) => goalOf(tag.target)))];
    const overlap = goals.filter((goal) => profile.sdgPriorities.includes(goal));
    const alignment = profile.sdgPriorities.length === 0 ? 0 : overlap.length / Math.min(2, profile.sdgPriorities.length);
    const rankByScenario = Object.fromEntries(SCENARIO_ORDER.map((id) => [id, ranks[id].get(role.id) ?? 99])) as Record<ScenarioId, number>;
    const occupation = OCCUPATIONS[role.soc];
    return {
      role,
      score: scored.score,
      points: scored.points,
      coverage: scored.coverage,
      demand: scored.demand,
      gaps: scored.gaps,
      strengths: scored.strengths,
      hoursToReady,
      weeksToReady: Math.ceil(hoursToReady / Math.max(1, profile.hoursPerWeek)),
      roleShift: occupation ? taskShift(occupation, scenario).value : 0,
      sdgGoals: goals,
      sdgOverlap: overlap,
      impactScore: Math.round(scored.score * (1 + 0.3 * sdgWeight * Math.min(1, alignment))),
      robust: SCENARIO_ORDER.every((id) => (rankByScenario[id] ?? 99) <= 5),
      rankByScenario,
    };
  });

  // Leave out the job the person already does; it is shown as "upgrade in place".
  const withoutCurrent = results.filter((match) => !(currentOccupation && match.role.soc === currentOccupation.soc && match.coverage > 0.9));
  return withoutCurrent.sort((a, b) => (sdgWeight > 0 ? b.impactScore - a.impactScore : b.score - a.score) || b.score - a.score);
}
