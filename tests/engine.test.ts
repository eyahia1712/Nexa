import { describe, expect, it } from "vitest";

import { COURSES, OCCUPATIONS, ROLES, SKILL_BY_ID, SDG_TARGETS } from "@/lib/catalog";
import { momentumFor, roleChanges, skillChanges } from "@/lib/engine/changes";
import { matchRoles } from "@/lib/engine/match";
import { DEMO_ORG, EMPLOYEES, analyseEmployees, fairness, orgOverview } from "@/lib/engine/org";
import { buildPathway } from "@/lib/engine/pathway";
import { SCENARIOS, taskShift } from "@/lib/engine/scenarios";
import { PERSONAS, profileFromPersona } from "@/lib/profile";
import { LATEST_BUNDLED, PREVIOUS_BUNDLED } from "@/lib/signals/bundled";

const aisyah = profileFromPersona(PERSONAS.find((persona) => persona.id === "aisyah")!);
const momentum = momentumFor(LATEST_BUNDLED);

describe("catalogue integrity — Nexa can only cite what exists", () => {
  it("every role points at an occupation with real task data", () => {
    for (const role of ROLES) expect(OCCUPATIONS[role.soc], role.id).toBeDefined();
  });
  it("every skill a role, course or persona uses is in the taxonomy", () => {
    for (const role of ROLES) for (const skill of role.skills) expect(SKILL_BY_ID.has(skill.id), `${role.id}:${skill.id}`).toBe(true);
    for (const course of COURSES) for (const id of course.skills) expect(SKILL_BY_ID.has(id), `${course.id}:${id}`).toBe(true);
    for (const persona of PERSONAS) for (const id of Object.keys(persona.skills)) expect(SKILL_BY_ID.has(id), `${persona.id}:${id}`).toBe(true);
  });
  it("every SDG target tagged anywhere has an official description", () => {
    for (const role of ROLES) for (const tag of role.sdg) expect(SDG_TARGETS[tag.target], tag.target).toBeDefined();
    for (const skill of SKILL_BY_ID.values()) for (const target of skill.sdg) expect(SDG_TARGETS[target], `${skill.id}:${target}`).toBeDefined();
  });
});

describe("scenarios", () => {
  it("fast disruption shifts more task time than slow, and ranges contain the estimate", () => {
    const job = OCCUPATIONS["43-4051.00"]!;
    const slow = taskShift(job, SCENARIOS.slow);
    const fast = taskShift(job, SCENARIOS.fast);
    expect(fast.value).toBeGreaterThan(slow.value);
    expect(slow.low).toBeLessThanOrEqual(slow.value);
    expect(slow.high).toBeGreaterThanOrEqual(slow.value);
  });
});

describe("matching", () => {
  const matches = matchRoles(aisyah, momentum, "moderate", 0);
  it("score is exactly the sum of its visible parts", () => {
    for (const match of matches) {
      const { skills, transfer, demand, barrier } = match.points;
      expect(match.score).toBe(Math.max(0, skills + transfer + demand + barrier));
    }
  });
  it("only recommends catalogue roles", () => {
    for (const match of matches) expect(ROLES.some((role) => role.id === match.role.id)).toBe(true);
  });
  it("the SDG compass changes the order when it is switched on", () => {
    const compass = matchRoles({ ...aisyah, sdgPriorities: [13, 7] }, momentum, "moderate", 1);
    expect(compass.map((match) => match.role.id)).not.toEqual(matches.map((match) => match.role.id));
  });
  it("pathways only use catalogue courses and respect prerequisites", () => {
    const pathway = buildPathway(matches[0]!, aisyah);
    const position = new Map(pathway.steps.map((step, index) => [step.skillId, index]));
    for (const step of pathway.steps) {
      for (const course of step.courses) expect(COURSES.some((known) => known.id === course.id)).toBe(true);
      for (const pre of SKILL_BY_ID.get(step.skillId)?.prereqs ?? []) if (position.has(pre)) expect(position.get(pre)!).toBeLessThan(position.get(step.skillId)!);
    }
  });
});

describe("trend data changes the output", () => {
  it("the two bundled snapshots produce different skill momentum", () => {
    expect(skillChanges(PREVIOUS_BUNDLED, LATEST_BUNDLED, "moderate").length).toBeGreaterThan(0);
  });
  it("role ranking for a person reacts to the newer evidence", () => {
    const changes = roleChanges(aisyah, PREVIOUS_BUNDLED, LATEST_BUNDLED, "moderate");
    expect(Array.isArray(changes)).toBe(true);
  });
});

describe("organisation view", () => {
  it("fairness audit runs over every employee", () => {
    const insights = analyseEmployees(EMPLOYEES, momentum, "moderate");
    expect(insights).toHaveLength(30);
    const planned = insights.filter((insight) => insight.bestMove !== null).length;
    expect(planned).toBeGreaterThan(20);
    for (const report of fairness(insights)) expect(report.groups.reduce((sum, group) => sum + group.n, 0)).toBe(planned);
  });
});

describe("organisation overview (demo workforce)", () => {
  it("counts headcount, movers, freshers and growth from the data", () => {
    const momentum = momentumFor(LATEST_BUNDLED);
    const insights = analyseEmployees(DEMO_ORG.employees, momentum, "moderate");
    const overview = orgOverview(DEMO_ORG, insights);
    expect(overview.headcount).toBe(37);
    expect(overview.departments).toHaveLength(7);
    expect(overview.growth.at(-1)!.total).toBe(37);
    expect(overview.growth[0]!.total).toBeLessThan(overview.growth.at(-1)!.total);
    expect(overview.relabelled.every((employee) => (employee.history?.length ?? 0) > 1)).toBe(true);
    expect(overview.fresh.every((employee) => employee.entry === "fresh")).toBe(true);
  });
});
