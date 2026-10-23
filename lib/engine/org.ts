import demoFile from "@/data/curated/org-maybank.json";
import orgFile from "@/data/curated/org.json";
import { OCCUPATIONS, ROLE_BY_ID, goalOf } from "@/lib/catalog";
import type { Profile, SkillLevel } from "@/lib/profile";

import { matchRoles, type RoleMatch } from "./match";
import type { SkillMomentum } from "./momentum";
import {
  SCENARIOS,
  SCENARIO_ORDER,
  taskShift,
  type ScenarioId,
  type Shift,
} from "./scenarios";

/**
 * The organisation view: the same engine as the individual view, run over a
 * whole (synthetic) workforce. It answers "who can we grow, into what, and how
 * long will it take" — never "who can we replace".
 */

export interface Employee {
  id: string;
  name: string;
  title: string;
  soc: string;
  dept: string;
  managerId: string | null;
  /** "U" = not stated (only possible in loaded data). */
  gender: "F" | "M" | "U";
  ageBand: "20-29" | "30-39" | "40-49" | "50+" | "Unknown";
  years: number;
  consent: boolean;
  skills: Record<string, SkillLevel>;
  /** Year they joined the organisation. */
  joined?: number;
  /** "fresh" = joined as a graduate or intern; "experienced" = hired with experience. */
  entry?: "fresh" | "experienced";
  /** Every job they have held here, oldest first (the last one is their job today). */
  history?: { year: number; title: string; soc: string }[];
}

/** A workforce the organisation view can show: the demo, or one loaded from a CSV. */
export interface OrgData {
  name: string;
  location: string;
  sector: string;
  note: string;
  demo: boolean;
  departments: string[];
  employees: Employee[];
}

/** The demo organisation for the organisation view (invented people; see the file's _about). */
export const DEMO_ORG: OrgData = {
  ...demoFile.organisation,
  demo: true,
  departments: demoFile.departments,
  employees: demoFile.employees as unknown as Employee[],
};

/** The small fictional bank used by the landing page preview. */
export const ORG = orgFile.organisation;
export const EMPLOYEES = orgFile.employees as unknown as Employee[];

/** Paid learning time an employer typically gives: 4 hours a week. */
export const EMPLOYER_HOURS_PER_WEEK = 4;

/** The skills an organisation most needs for an AI-era plan (heatmap columns). */
export const FUTURE_SKILLS = [
  "genai",
  "ai_agents",
  "data_analysis",
  "data_viz",
  "cybersecurity",
  "cloud",
  "project_mgmt",
  "ux_design",
  "sustainability_esg",
  "ai_ethics",
];

/** Executives and managers lead the change; Nexa does not plan moves for them. */
export function isLeader(employee: Employee): boolean {
  return employee.soc.startsWith("11-");
}

export function employeeProfile(employee: Employee): Profile {
  return {
    id: employee.id,
    name: employee.name,
    currentSoc: employee.soc,
    years: employee.years,
    hoursPerWeek: EMPLOYER_HOURS_PER_WEEK,
    sdgPriorities: [],
    skills: employee.skills,
    source: "form",
  };
}

export interface EmployeeInsight {
  employee: Employee;
  shift: Shift;
  shiftByScenario: Record<ScenarioId, number>;
  matches: RoleMatch[];
  bestMove: RoleMatch | null;
}

export function analyseEmployees(
  employees: Employee[],
  momentumByScenario: Record<ScenarioId, Map<string, SkillMomentum>>,
  scenarioId: ScenarioId,
): EmployeeInsight[] {
  return employees.map((employee) => {
    const occupation = OCCUPATIONS[employee.soc];
    const exposure = occupation ?? { exposure: 0 };
    const matches = matchRoles(
      employeeProfile(employee),
      momentumByScenario,
      scenarioId,
      0,
      { orgOnly: true },
    );
    const bestMove = isLeader(employee)
      ? null
      : (matches.find((match) => match.role.soc !== employee.soc) ?? null);
    return {
      employee,
      shift: taskShift(exposure, SCENARIOS[scenarioId]),
      shiftByScenario: Object.fromEntries(
        SCENARIO_ORDER.map((id) => [
          id,
          taskShift(exposure, SCENARIOS[id]).value,
        ]),
      ) as Record<ScenarioId, number>,
      matches,
      bestMove,
    };
  });
}

export function exposureBand(shift: number): "high" | "medium" | "low" {
  if (shift >= 0.4) return "high";
  if (shift >= 0.2) return "medium";
  return "low";
}

export interface HeatCell {
  dept: string;
  skillId: string;
  share: number;
  count: number;
  headcount: number;
}

export function skillHeatmap(
  employees: Employee[],
  departments: string[],
): HeatCell[] {
  const cells: HeatCell[] = [];
  for (const dept of departments) {
    const people = employees.filter((employee) => employee.dept === dept);
    for (const skillId of FUTURE_SKILLS) {
      const count = people.filter(
        (employee) => (employee.skills[skillId] ?? 0) >= 2,
      ).length;
      cells.push({
        dept,
        skillId,
        count,
        headcount: people.length,
        share: people.length === 0 ? 0 : count / people.length,
      });
    }
  }
  return cells;
}

export interface RoleOutlook {
  soc: string;
  title: string;
  label: string;
  headcount: number;
  exposure: number;
  automateShare: number;
  branches: {
    scenario: ScenarioId;
    similar: number;
    assisted: number;
    automated: number;
  }[];
  internalMoves: { roleId: string; count: number }[];
}

/**
 * For each job in the organisation: how its task time may split by 2030 in
 * each scenario — work that stays as it is, work done together with AI, and
 * work AI takes over (time freed for new tasks).
 */
export function roleOutlooks(insights: EmployeeInsight[]): RoleOutlook[] {
  const bySoc = new Map<string, EmployeeInsight[]>();
  for (const insight of insights)
    bySoc.set(insight.employee.soc, [
      ...(bySoc.get(insight.employee.soc) ?? []),
      insight,
    ]);
  return [...bySoc.entries()]
    .map(([soc, group]) => {
      const occupation = OCCUPATIONS[soc]!;
      const moves = new Map<string, number>();
      for (const insight of group)
        if (insight.bestMove)
          moves.set(
            insight.bestMove.role.id,
            (moves.get(insight.bestMove.role.id) ?? 0) + 1,
          );
      return {
        soc,
        title: occupation.title,
        label: occupation.label,
        headcount: group.length,
        exposure: occupation.exposure,
        automateShare: occupation.automateShare,
        branches: SCENARIO_ORDER.map((scenario) => {
          const shifted = taskShift(occupation, SCENARIOS[scenario]).value;
          return {
            scenario,
            similar: 1 - shifted,
            assisted: shifted * (1 - occupation.automateShare),
            automated: shifted * occupation.automateShare,
          };
        }),
        internalMoves: [...moves.entries()]
          .map(([roleId, count]) => ({ roleId, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => b.exposure * b.headcount - a.exposure * a.headcount);
}

export interface Cohort {
  roleId: string;
  members: EmployeeInsight[];
  avgScore: number;
  avgWeeks: number;
  totalHours: number;
}

/** Group people by their best internal move into reskilling cohorts. */
export function cohorts(insights: EmployeeInsight[]): Cohort[] {
  const groups = new Map<string, EmployeeInsight[]>();
  for (const insight of insights) {
    if (!insight.bestMove || insight.shift.value < 0.2) continue;
    groups.set(insight.bestMove.role.id, [
      ...(groups.get(insight.bestMove.role.id) ?? []),
      insight,
    ]);
  }
  return [...groups.entries()]
    .map(([roleId, members]) => ({
      roleId,
      members,
      avgScore: Math.round(
        members.reduce(
          (sum, member) => sum + (member.bestMove?.score ?? 0),
          0,
        ) / members.length,
      ),
      avgWeeks: Math.round(
        members.reduce(
          (sum, member) => sum + (member.bestMove?.weeksToReady ?? 0),
          0,
        ) / members.length,
      ),
      totalHours: members.reduce(
        (sum, member) => sum + (member.bestMove?.hoursToReady ?? 0),
        0,
      ),
    }))
    .sort(
      (a, b) => b.members.length - a.members.length || b.avgScore - a.avgScore,
    );
}

export interface FairnessGroup {
  group: string;
  n: number;
  avgBestScore: number;
  avgShift: number;
}

export interface FairnessReport {
  dimension: "Gender" | "Age band";
  groups: FairnessGroup[];
  scoreGap: number;
  flagged: boolean;
}

/** Recommendations should not systematically favour one group. Flag gaps over 10 points. */
export function fairness(insights: EmployeeInsight[]): FairnessReport[] {
  const report = (
    dimension: FairnessReport["dimension"],
    key: (employee: Employee) => string,
  ): FairnessReport => {
    const groups = new Map<string, EmployeeInsight[]>();
    for (const insight of insights.filter((item) => item.bestMove !== null))
      groups.set(key(insight.employee), [
        ...(groups.get(key(insight.employee)) ?? []),
        insight,
      ]);
    const rows = [...groups.entries()]
      .map(([group, members]) => ({
        group,
        n: members.length,
        avgBestScore: Math.round(
          members.reduce(
            (sum, member) => sum + (member.bestMove?.score ?? 0),
            0,
          ) / members.length,
        ),
        avgShift:
          members.reduce((sum, member) => sum + member.shift.value, 0) /
          members.length,
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
    const scores = rows.map((row) => row.avgBestScore);
    const gap = Math.max(...scores) - Math.min(...scores);
    return { dimension, groups: rows, scoreGap: gap, flagged: gap > 10 };
  };
  return [
    report("Gender", (employee) =>
      employee.gender === "F"
        ? "Women"
        : employee.gender === "M"
          ? "Men"
          : "Not stated",
    ),
    report("Age band", (employee) => employee.ageBand),
  ];
}

/** Which SDG goals the organisation's reskilling plan advances, and through how many people. */
export function sdgContribution(
  insights: EmployeeInsight[],
): { goal: number; people: number; targets: string[] }[] {
  const byGoal = new Map<
    number,
    { people: Set<string>; targets: Set<string> }
  >();
  for (const insight of insights) {
    const role = insight.bestMove
      ? ROLE_BY_ID.get(insight.bestMove.role.id)
      : null;
    if (!role || insight.shift.value < 0.2) continue;
    for (const tag of role.sdg) {
      const goal = goalOf(tag.target);
      const entry = byGoal.get(goal) ?? {
        people: new Set<string>(),
        targets: new Set<string>(),
      };
      entry.people.add(insight.employee.id);
      entry.targets.add(tag.target);
      byGoal.set(goal, entry);
    }
  }
  // Every reskilled person advances SDG 4.4 (relevant skills for decent work).
  const learners = insights
    .filter((insight) => insight.bestMove && insight.shift.value >= 0.2)
    .map((insight) => insight.employee.id);
  const four = byGoal.get(4) ?? {
    people: new Set<string>(),
    targets: new Set<string>(),
  };
  learners.forEach((id) => four.people.add(id));
  four.targets.add("4.4");
  byGoal.set(4, four);
  return [...byGoal.entries()]
    .map(([goal, entry]) => ({
      goal,
      people: entry.people.size,
      targets: [...entry.targets].sort(),
    }))
    .sort((a, b) => b.people - a.people);
}

/* ----------------------------------------------------------------------------
   Workforce overview: headcount, departments, who changed role, who joined new,
   and how the organisation grew year by year.
---------------------------------------------------------------------------- */

export const historyOf = (employee: Employee) =>
  employee.history ?? [
    {
      year: employee.joined ?? 2026 - employee.years,
      title: employee.title,
      soc: employee.soc,
    },
  ];
export const joinedYear = (employee: Employee) =>
  employee.joined ?? historyOf(employee)[0]!.year;

/** Moved into a different job inside the organisation at least once. */
export const isRelabelled = (employee: Employee) =>
  historyOf(employee).length > 1;
/** Joined straight from study (graduate or intern). */
export const isFresh = (employee: Employee) => employee.entry === "fresh";

export interface YearPoint {
  year: number;
  total: number;
  byDept: Record<string, number>;
  joined: number;
  freshJoined: number;
  moves: number;
}

export interface OrgOverview {
  headcount: number;
  departments: {
    name: string;
    headcount: number;
    roles: number;
    avgShift: number;
  }[];
  roles: number;
  relabelled: Employee[];
  fresh: Employee[];
  growth: YearPoint[];
}

export function orgOverview(
  data: OrgData,
  insights: EmployeeInsight[],
  fromYear = 2022,
  toYear = 2026,
): OrgOverview {
  const { employees } = data;
  const shiftOf = new Map(
    insights.map((insight) => [insight.employee.id, insight.shift.value]),
  );
  const departments = data.departments
    .map((name) => {
      const people = employees.filter((employee) => employee.dept === name);
      return {
        name,
        headcount: people.length,
        roles: new Set(people.map((employee) => employee.title)).size,
        avgShift:
          people.length === 0
            ? 0
            : people.reduce(
                (sum, employee) => sum + (shiftOf.get(employee.id) ?? 0),
                0,
              ) / people.length,
      };
    })
    .filter((dept) => dept.headcount > 0);
  const growth: YearPoint[] = [];
  for (let year = fromYear; year <= toYear; year += 1) {
    const present = employees.filter(
      (employee) => joinedYear(employee) <= year,
    );
    growth.push({
      year,
      total: present.length,
      byDept: Object.fromEntries(
        departments.map((dept) => [
          dept.name,
          present.filter((employee) => employee.dept === dept.name).length,
        ]),
      ),
      joined: employees.filter((employee) => joinedYear(employee) === year)
        .length,
      freshJoined: employees.filter(
        (employee) => joinedYear(employee) === year && isFresh(employee),
      ).length,
      moves: employees.reduce(
        (sum, employee) =>
          sum +
          historyOf(employee)
            .slice(1)
            .filter((step) => step.year === year).length,
        0,
      ),
    });
  }
  return {
    headcount: employees.length,
    departments,
    roles: new Set(employees.map((employee) => employee.title)).size,
    relabelled: employees.filter(isRelabelled),
    fresh: employees.filter(isFresh),
    growth,
  };
}
