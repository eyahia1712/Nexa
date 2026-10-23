import { SKILL_BY_ID, type Course } from "@/lib/catalog";
import type { Profile } from "@/lib/profile";

import { coursesFor, hoursForSkill } from "./courses";
import type { RoleMatch } from "./match";

/**
 * The reskilling pathway for one chosen role: every skill gap, ordered so that
 * prerequisites come first, then foundations, then the role's essentials; each
 * step paired with real courses from the catalogue and a time estimate that
 * fits the hours the person said they have.
 */

export interface PathwayStep {
  skillId: string;
  reason: "prerequisite" | "core" | "important" | "helpful";
  bridge: string | null;
  have: number;
  hours: number;
  weeks: number;
  startWeek: number;
  endWeek: number;
  courses: (Course & { verified: boolean })[];
  sdgTargets: string[];
}

export interface Pathway {
  roleId: string;
  steps: PathwayStep[];
  totalHours: number;
  totalWeeks: number;
  freeShare: number;
}

export function buildPathway(match: RoleMatch, profile: Profile): Pathway {
  const wanted = new Map<string, { reason: PathwayStep["reason"]; have: number; bridge: string | null }>();
  for (const gap of match.gaps) {
    wanted.set(gap.skillId, { reason: gap.core ? "core" : gap.weight >= 2 ? "important" : "helpful", have: gap.have, bridge: gap.bridge });
  }
  // Pull in prerequisites the person does not have yet.
  for (const skillId of [...wanted.keys()]) {
    for (const pre of SKILL_BY_ID.get(skillId)?.prereqs ?? []) {
      const level = profile.skills[pre] ?? 0;
      if (level < 2 && !wanted.has(pre)) wanted.set(pre, { reason: "prerequisite", have: Math.min(level / 2, 1), bridge: null });
    }
  }

  const order: string[] = [];
  const visit = (id: string, seen = new Set<string>()) => {
    if (order.includes(id) || seen.has(id)) return;
    seen.add(id);
    for (const pre of SKILL_BY_ID.get(id)?.prereqs ?? []) if (wanted.has(pre)) visit(pre, seen);
    order.push(id);
  };
  const priority = { prerequisite: 0, core: 1, important: 2, helpful: 3 } as const;
  [...wanted.entries()]
    .sort(([a, x], [b, y]) => (SKILL_BY_ID.get(a)?.level ?? 1) - (SKILL_BY_ID.get(b)?.level ?? 1) || priority[x.reason] - priority[y.reason])
    .forEach(([id]) => visit(id));

  let week = 0;
  const hoursPerWeek = Math.max(1, profile.hoursPerWeek);
  const steps = order.map((skillId): PathwayStep => {
    const info = wanted.get(skillId)!;
    const hours = hoursForSkill(skillId, info.have);
    const weeks = Math.max(1, Math.ceil(hours / hoursPerWeek));
    const step: PathwayStep = {
      skillId,
      reason: info.reason,
      bridge: info.bridge,
      have: info.have,
      hours,
      weeks,
      startWeek: week + 1,
      endWeek: week + weeks,
      courses: coursesFor(skillId),
      sdgTargets: SKILL_BY_ID.get(skillId)?.sdg ?? [],
    };
    week += weeks;
    return step;
  });

  const totalHours = steps.reduce((sum, step) => sum + step.hours, 0);
  const free = steps.filter((step) => step.courses[0]?.cost === "free" || step.courses[0]?.cost === "audit").length;
  return { roleId: match.role.id, steps, totalHours, totalWeeks: week, freeShare: steps.length === 0 ? 1 : free / steps.length };
}
