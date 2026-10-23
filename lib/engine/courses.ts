import { COURSES, SKILL_BY_ID, linkVerified, type Course } from "@/lib/catalog";

const COST_ORDER = { free: 0, audit: 1, employer: 2, paid: 3 } as const;

/**
 * The courses Nexa suggests for a skill, best first: free before paid, then the
 * one whose level fits the skill, then the shorter one. Only catalogue
 * courses can ever appear.
 */
export function coursesFor(skillId: string, max = 3): (Course & { verified: boolean })[] {
  const level = SKILL_BY_ID.get(skillId)?.level ?? 1;
  return COURSES.filter((course) => course.skills.includes(skillId))
    .sort((a, b) => COST_ORDER[a.cost] - COST_ORDER[b.cost] || Math.abs(a.level - level) - Math.abs(b.level - level) || a.hours - b.hours)
    .slice(0, max)
    .map((course) => ({ ...course, verified: linkVerified(course.id) }));
}

/** Learning hours to close one skill gap, from the first-choice course. */
export function hoursForSkill(skillId: string, haveShare: number): number {
  const best = coursesFor(skillId, 1)[0];
  const hours = best?.hours ?? 20;
  return Math.max(2, Math.round(hours * (1 - haveShare)));
}
