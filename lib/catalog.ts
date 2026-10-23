/**
 * The curated catalogue and the evidence files, typed and indexed. This is
 * the whole world Nexa can talk about: it never recommends a role, skill or
 * course that is not in these files.
 */
import courseFile from "@/data/curated/courses.json";
import occupationTaskFile from "@/data/occupation-tasks.json";
import roleFile from "@/data/curated/roles.json";
import sdgFile from "@/data/curated/sdgs.json";
import skillFile from "@/data/curated/skills.json";
import linkCheckFile from "@/data/link-check.json";

export type SkillCategory = "AI & data" | "Technology" | "Business" | "Human" | "Green & health";
export type WefDirection = "rising" | "stable" | "declining";

export interface Skill {
  id: string;
  label: string;
  category: SkillCategory;
  wef: WefDirection;
  wefCluster: string;
  arxiv: string | null;
  routineSoc: string | null;
  sdg: string[];
  level: 1 | 2 | 3;
  prereqs: string[];
  related: string[];
  keywords: string[];
}

export interface RoleSkill {
  id: string;
  w: 1 | 2 | 3;
  core?: boolean;
}

export interface Role {
  id: string;
  label: string;
  soc: string;
  family: string;
  summary: string;
  outlook: { direction: "growing" | "steady" | "declining"; strength: number; evidence: { source: string; note: string }[] };
  aiAffinity: number;
  skills: RoleSkill[];
  sdg: { target: string; why: string }[];
  /** How hard the role is to enter for someone without the formal route. */
  entry: { barrier: "open" | "degree" | "licence"; note: string };
  /** Whether an employer like a bank could create this role internally. */
  orgMobility: boolean;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  skills: string[];
  hours: number;
  approx?: boolean;
  cost: "free" | "audit" | "paid" | "employer";
  level: number;
}

export interface Task {
  id: string;
  text: string;
  type: string;
  importance: number;
  coverage: number;
  mode: "automate" | "assist" | "human" | "unknown";
  automation: number | null;
  augmentation: number | null;
}

export interface Occupation {
  soc: string;
  title: string;
  label: string;
  family: string;
  kind: "current" | "anchor" | "both";
  /** Set when WEF lists the job among the fastest-declining for reasons beyond AI. */
  declineNote: string | null;
  exposure: number;
  exposureSource: "aei_job_exposure" | "nexa_task_weighted";
  computedExposure: number;
  taskCount: number;
  coveredTaskCount: number;
  automateShare: number;
  tasks: Task[];
}

export interface SdgGoal {
  n: number;
  name: string;
  color: string;
}

export interface SourceRef {
  name: string;
  url: string;
  published?: string;
  publisher?: string;
  licence?: string;
}

export const SKILLS = skillFile.skills as Skill[];
export const ROLES = roleFile.roles as Role[];
export const ROLE_SOURCES = roleFile.sources as Record<string, SourceRef>;
export const COURSES = courseFile.courses as Course[];
export const HRDCORP = courseFile.hrdcorp;
export const OCCUPATIONS = occupationTaskFile.occupations as unknown as Record<string, Occupation>;
export const EVIDENCE_SOURCES = occupationTaskFile.sources as Record<string, SourceRef>;
export const DATA_BUILT_ON = occupationTaskFile.generatedOn;
export const TASK_UNIVERSE = occupationTaskFile.universe;
export const SDG_GOALS = sdgFile.goals as SdgGoal[];
export const SDG_TARGETS = sdgFile.targets as Record<string, string>;
export const SDG_SOURCE = sdgFile.source as SourceRef;
export const LINK_CHECK = linkCheckFile as { checkedOn: string; results: Record<string, { url: string; status: number }> };

export const SKILL_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));
export const ROLE_BY_ID = new Map(ROLES.map((role) => [role.id, role]));
export const COURSE_BY_ID = new Map(COURSES.map((course) => [course.id, course]));

export const CURRENT_OCCUPATIONS = Object.values(OCCUPATIONS)
  .filter((occupation) => occupation.kind !== "anchor")
  .sort((a, b) => a.family.localeCompare(b.family) || a.label.localeCompare(b.label));

export function skillLabel(id: string): string {
  return SKILL_BY_ID.get(id)?.label ?? id;
}

/** The goal number of a target such as "8.5" or "4.c". */
export function goalOf(target: string): number {
  return Number(target.split(".")[0]);
}

export function goal(n: number): SdgGoal {
  return SDG_GOALS[n - 1] ?? { n, name: `SDG ${n}`, color: "#5c5a54" };
}

export function linkVerified(courseId: string): boolean {
  const status = LINK_CHECK.results[courseId]?.status ?? 0;
  return status >= 200 && status < 400;
}
