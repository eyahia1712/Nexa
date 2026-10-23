"use client";

import { useMemo, useState } from "react";

import { Micro } from "@/components/ui/bits";
import { ROLE_BY_ID, SDG_TARGETS, SKILL_BY_ID, goal } from "@/lib/catalog";
import {
  EMPLOYER_HOURS_PER_WEEK,
  FUTURE_SKILLS,
  exposureBand,
  type Cohort,
  type Employee,
  type EmployeeInsight,
  type FairnessReport,
  type OrgData,
} from "@/lib/engine/org";
import { cn, initials } from "@/lib/utils";

import { DEPT_COLORS, SHIFT_COLOR } from "./org-colors";

/**
 * The organisation tabs, all built from the same card as the landing page's
 * problem boxes: white, rounded, a big number, a small picture, the source
 * in small print. Short words; the pictures carry the meaning.
 */

export function Box({
  children,
  source,
  className,
  onClick,
  active,
}: {
  children: React.ReactNode;
  source?: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const body = (
    <>
      <div className="flex-1">{children}</div>
      {source ? <p className="mt-4 text-[11px] text-ink-3">{source}</p> : null}
    </>
  );
  const style = cn(
    "group flex flex-col rounded-2xl border bg-card p-5 text-left text-ink shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] transition-transform duration-300 hover:-translate-y-1",
    active
      ? "border-saffron ring-2 ring-saffron-soft"
      : "border-line-strong/60",
    className,
  );
  return onClick ? (
    <button onClick={onClick} className={cn("nx-focus", style)}>
      {body}
    </button>
  ) : (
    <article className={style}>{body}</article>
  );
}

const deptColors = (departments: string[]) =>
  new Map(
    departments.map((dept, index) => [
      dept,
      DEPT_COLORS[index % DEPT_COLORS.length]!,
    ]),
  );

/** A short way to name someone: the given name, skipping Muhammad / Nur / a leading surname. */
export function shortName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const lower = parts.map((part) => part.toLowerCase());
  if (
    parts.length >= 2 &&
    [
      "muhammad",
      "mohd",
      "mohamad",
      "mohammad",
      "nur",
      "nurul",
      "siti",
      "ahmad",
    ].includes(lower[0]!)
  )
    return parts[1]!;
  if (
    parts.length === 3 &&
    [
      "tan",
      "lee",
      "lim",
      "wong",
      "chen",
      "chong",
      "goh",
      "lau",
      "teoh",
      "yeoh",
      "chua",
      "ng",
      "koh",
      "low",
      "ong",
    ].includes(lower[0]!)
  )
    return `${parts[1]} ${parts[2]}`;
  return parts[0] ?? name;
}

/* ---------------------------------------------------------------- Org tree */

/**
 * The whole organisation on one screen, by position: CEO, then the leaders
 * who report to them, then each team grouped by job title with the short
 * names of the people who hold it. Nothing scrolls sideways.
 */
export function OrgTreeView({
  data,
  insights,
  onSelect,
  onAdd,
}: {
  data: OrgData;
  insights: EmployeeInsight[];
  onSelect: (id: string) => void;
  /** Opens the "add a person or department" form. */
  onAdd?: () => void;
}) {
  const colors = deptColors(data.departments);
  const shift = new Map(
    insights.map((insight) => [insight.employee.id, insight.shift.value]),
  );
  const reports = (id: string) =>
    data.employees.filter((employee) => employee.managerId === id);
  const below = (id: string): Employee[] =>
    reports(id).flatMap((employee) => [employee, ...below(employee.id)]);
  const isLead = (employee: Employee) => reports(employee.id).length > 0;
  const root = data.employees.find((employee) => employee.managerId === null);
  if (!root) return null;

  /** A leader with only individual contributors under them: one column. With sub-leaders: one column each. */
  const columnsOf = (leader: Employee) => {
    const subs = reports(leader.id).filter(isLead);
    const loose = reports(leader.id).filter((employee) => !isLead(employee));
    return subs.length === 0 ? 1 : subs.length + (loose.length > 0 ? 1 : 0);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Micro>02 · Org tree</Micro>
          <p className="mt-1 text-[13px] text-ink-3">
            {data.employees.length} people · by position · tap a name to open
            their story
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-ink-2">
          {(
            [
              ["low", "<20% with AI"],
              ["medium", "20–40%"],
              ["high", "40%+"],
            ] as const
          ).map(([band, label]) => (
            <span key={band} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: SHIFT_COLOR[band] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="nx-dotgrid relative rounded-2xl border border-line-strong/60 bg-card p-4 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
        {onAdd ? (
          <button
            onClick={onAdd}
            className="nx-focus absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_22px_-12px_#2a78d6] transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg,#2a78d6,#6250d6)" }}
          >
            <span className="text-[15px] leading-none">+</span> Add
          </button>
        ) : null}
        <div className="mx-auto w-[190px]">
          <TreeLead
            employee={root}
            team={below(root.id).length}
            colors={colors}
            onSelect={onSelect}
          />
        </div>
        <div className="nx-tree-children">
          <div className="flex">
            {reports(root.id).map((leader) => {
              const subs = reports(leader.id).filter(isLead);
              const loose = reports(leader.id).filter(
                (employee) => !isLead(employee),
              );
              return (
                <div
                  key={leader.id}
                  className="nx-tree-branch min-w-0 px-1"
                  style={{ flex: columnsOf(leader) }}
                >
                  <TreeLead
                    employee={leader}
                    team={below(leader.id).length}
                    colors={colors}
                    onSelect={onSelect}
                  />
                  {subs.length === 0 ? (
                    loose.length > 0 ? (
                      <TreeTeam
                        colors={colors}
                        shift={shift}
                        onSelect={onSelect}
                        people={below(leader.id)}
                      />
                    ) : null
                  ) : (
                    <div className="nx-tree-children">
                      <div className="flex">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="nx-tree-branch min-w-0 flex-1 px-1"
                          >
                            <TreeLead
                              employee={sub}
                              team={below(sub.id).length}
                              colors={colors}
                              onSelect={onSelect}
                            />
                            <TreeTeam
                              colors={colors}
                              shift={shift}
                              onSelect={onSelect}
                              people={below(sub.id)}
                            />
                          </div>
                        ))}
                        {loose.length > 0 ? (
                          <div className="nx-tree-branch min-w-0 flex-1 px-1">
                            <TreeTeam
                              colors={colors}
                              shift={shift}
                              onSelect={onSelect}
                              people={loose.flatMap((employee) => [
                                employee,
                                ...below(employee.id),
                              ])}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeTeam({
  people,
  colors,
  shift,
  onSelect,
}: {
  people: Employee[];
  colors: Map<string, string>;
  shift: Map<string, number>;
  onSelect: (id: string) => void;
}) {
  const groups = [...new Set(people.map((employee) => employee.title))].map(
    (title) => ({
      title,
      people: people.filter((employee) => employee.title === title),
    }),
  );
  return (
    <div className="mt-2 space-y-1.5">
      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-lg border border-line bg-card px-2 py-1.5"
          style={{
            borderLeft: `3px solid ${colors.get(group.people[0]!.dept)}`,
          }}
        >
          <p className="flex items-start justify-between gap-1 text-[11px] leading-tight font-medium">
            <span className="line-clamp-2">{group.title}</span>
            {group.people.length > 1 ? (
              <span className="shrink-0 font-mono text-[10px] text-ink-3">
                ×{group.people.length}
              </span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {group.people.map((employee) => (
              <button
                key={employee.id}
                onClick={() => onSelect(employee.id)}
                title={`${employee.consent ? employee.name : "Profile not shared"} · ${Math.round((shift.get(employee.id) ?? 0) * 100)}% with AI`}
                className="nx-focus inline-flex items-center gap-1 rounded-full bg-paper-2 px-1.5 py-0.5 text-[10px] leading-none text-ink-2 hover:bg-stone hover:text-ink"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background:
                      SHIFT_COLOR[exposureBand(shift.get(employee.id) ?? 0)],
                  }}
                />
                {employee.consent ? shortName(employee.name) : "··"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeLead({
  employee,
  team,
  colors,
  onSelect,
}: {
  employee: Employee;
  team: number;
  colors: Map<string, string>;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(employee.id)}
      className="nx-focus mx-auto block w-full max-w-[170px] overflow-hidden rounded-lg border border-line-strong/70 bg-card text-left shadow-[0_6px_16px_-12px_rgb(0_0_0/45%)] transition-shadow hover:shadow-[0_10px_22px_-12px_rgb(0_0_0/50%)]"
    >
      <span
        className="block h-1"
        style={{ background: colors.get(employee.dept) }}
      />
      <span className="block px-2 py-1.5">
        <span className="line-clamp-2 text-[11.5px] leading-tight font-semibold">
          {employee.title}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-ink-3">
          <span className="truncate">
            {employee.consent ? shortName(employee.name) : "··"}
          </span>
          {team > 0 ? (
            <span className="shrink-0 font-mono">{team} in team</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------- Skills (pie) */

function Donut({
  parts,
  colors,
  size = 220,
  stroke,
  active,
  onPick,
  children,
}: {
  parts: number[];
  colors: string[];
  size?: number;
  stroke?: number;
  active?: number | null;
  onPick?: (index: number | null) => void;
  children?: React.ReactNode;
}) {
  const total = parts.reduce((sum, part) => sum + part, 0) || 1;
  const width = stroke ?? size * 0.17;
  const r = (size - width) / 2 - 4;
  const c = 2 * Math.PI * r;
  const offsets = parts.map((_, index) =>
    parts.slice(0, index).reduce((sum, part) => sum + (part / total) * c, 0),
  );
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        width={size}
        height={size}
        onPointerLeave={() => onPick?.(null)}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--stone)"
          strokeWidth={width}
        />
        {parts.map((part, index) => {
          const length = (part / total) * c;
          const dash = `${Math.max(0, length - (parts.length > 1 ? 2 : 0))} ${c}`;
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth={active === index ? width + 8 : width}
              strokeDasharray={dash}
              strokeDashoffset={-offsets[index]!}
              opacity={
                active !== null && active !== undefined && active !== index
                  ? 0.35
                  : 1
              }
              style={{
                transition: "stroke-width 160ms, opacity 160ms",
                cursor: onPick ? "pointer" : undefined,
              }}
              onPointerEnter={() => onPick?.(index)}
            />
          );
        })}
      </svg>
      {children ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Two pies. Left: who works where (one slice per department). Right: the
 * future skills people hold at working level — for the whole organisation,
 * or for the department picked on the left.
 */
export function SkillsPies({ data }: { data: OrgData }) {
  const colors = deptColors(data.departments);
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [skillHover, setSkillHover] = useState<number | null>(null);
  const depts = data.departments
    .map((name) => ({
      name,
      people: data.employees.filter((employee) => employee.dept === name),
    }))
    .filter((dept) => dept.people.length > 0);
  const focus = hover !== null ? depts[hover]!.name : picked;
  const pool = focus
    ? data.employees.filter((employee) => employee.dept === focus)
    : data.employees;
  const skills = useMemo(
    () =>
      FUTURE_SKILLS.map((skillId) => ({
        skillId,
        count: pool.filter((employee) => (employee.skills[skillId] ?? 0) >= 2)
          .length,
      }))
        .filter((skill) => skill.count > 0)
        .sort((a, b) => b.count - a.count),
    [pool],
  );
  const skillColors = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#6250d6",
    "#e87ba4",
    "#008300",
    "#e34948",
    "#0a97d9",
    "#bf8b2e",
  ];
  const missing = FUTURE_SKILLS.filter(
    (skillId) => !skills.some((skill) => skill.skillId === skillId),
  );
  const centre = skillHover !== null ? skills[skillHover] : null;

  return (
    <div className="space-y-4">
      <div>
        <Micro>03 · Skills</Micro>
        <p className="mt-1 text-[13px] text-ink-3">
          Tap a department to see its future skills
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box source="Headcount by department">
          <p className="nx-micro text-[11px] text-ink-3">People</p>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <Donut
              parts={depts.map((dept) => dept.people.length)}
              colors={depts.map((dept) => colors.get(dept.name)!)}
              active={
                hover ??
                (picked
                  ? depts.findIndex((dept) => dept.name === picked)
                  : null)
              }
              onPick={setHover}
            >
              <div>
                <p className="font-mono text-[34px] leading-none font-semibold">
                  {focus
                    ? depts.find((dept) => dept.name === focus)?.people.length
                    : data.employees.length}
                </p>
                <p className="mt-1 max-w-[110px] text-[12px] leading-tight text-ink-2">
                  {focus ?? "people"}
                </p>
              </div>
            </Donut>
            <ul className="min-w-[150px] flex-1 space-y-1">
              {depts.map((dept, index) => (
                <li key={dept.name}>
                  <button
                    onClick={() =>
                      setPicked(picked === dept.name ? null : dept.name)
                    }
                    onPointerEnter={() => setHover(index)}
                    onPointerLeave={() => setHover(null)}
                    className={cn(
                      "nx-focus flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] hover:bg-paper-2",
                      picked === dept.name && "bg-paper-2 font-semibold",
                    )}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: colors.get(dept.name) }}
                    />
                    <span className="flex-1 truncate">{dept.name}</span>
                    <span className="font-mono text-[12px]">
                      {dept.people.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Box>

        <Box source="People with the skill at working level or above · a person can hold several">
          <p className="nx-micro text-[11px] text-ink-3">
            Future skills · {focus ?? "whole organisation"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <Donut
              parts={skills.map((skill) => skill.count)}
              colors={skillColors}
              active={skillHover}
              onPick={setSkillHover}
            >
              <div>
                <p className="font-mono text-[34px] leading-none font-semibold">
                  {centre ? centre.count : skills.length}
                </p>
                <p className="mt-1 max-w-[110px] text-[12px] leading-tight text-ink-2">
                  {centre
                    ? SKILL_BY_ID.get(centre.skillId)?.label
                    : `of ${FUTURE_SKILLS.length} future skills`}
                </p>
              </div>
            </Donut>
            <ul className="min-w-[150px] flex-1 space-y-1">
              {skills.map((skill, index) => (
                <li
                  key={skill.skillId}
                  className="flex items-center gap-2 px-1.5 py-0.5 text-[12.5px]"
                  onPointerEnter={() => setSkillHover(index)}
                  onPointerLeave={() => setSkillHover(null)}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      background: skillColors[index % skillColors.length],
                    }}
                  />
                  <span className="flex-1 truncate">
                    {SKILL_BY_ID.get(skill.skillId)?.label}
                  </span>
                  <span className="font-mono text-[12px]">{skill.count}</span>
                </li>
              ))}
              {skills.length === 0 ? (
                <li className="text-[12.5px] text-ink-3">
                  No future skills yet
                </li>
              ) : null}
            </ul>
          </div>
          {missing.length > 0 ? (
            <p className="mt-3 text-[12px] text-ink-2">
              <span className="font-medium text-auto">Gap:</span>{" "}
              {missing
                .map((skillId) => SKILL_BY_ID.get(skillId)?.label)
                .join(" · ")}
            </p>
          ) : null}
        </Box>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Mobility */

export function MobilityCards({
  teams,
  insights,
  departments,
  onSelect,
}: {
  teams: Cohort[];
  insights: EmployeeInsight[];
  departments: string[];
  onSelect: (id: string) => void;
}) {
  const colors = deptColors(departments);
  const learners = teams.reduce((sum, team) => sum + team.members.length, 0);
  const growing = [
    ...new Set(
      insights.flatMap((insight) =>
        insight.matches.slice(0, 3).map((match) => match.role.id),
      ),
    ),
  ]
    .map((roleId) => ROLE_BY_ID.get(roleId)!)
    .filter((role) => role.outlook.direction === "growing")
    .map((role) => ({
      role,
      candidates: insights
        .filter(
          (insight) =>
            insight.bestMove !== null && insight.employee.soc !== role.soc,
        )
        .map((insight) => ({
          insight,
          match: insight.matches.find((match) => match.role.id === role.id),
        }))
        .filter(
          (
            item,
          ): item is {
            insight: EmployeeInsight;
            match: NonNullable<typeof item.match>;
          } => Boolean(item.match),
        )
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 3),
    }))
    .filter((item) => item.candidates.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <Micro>04 · Mobility</Micro>
        <p className="mt-1 text-[13px] text-ink-3">
          {learners} people in {teams.length} reskilling groups ·{" "}
          {EMPLOYER_HOURS_PER_WEEK} paid learning hours a week
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teams.map((team) => {
          const role = ROLE_BY_ID.get(team.roleId)!;
          return (
            <Box
              key={team.roleId}
              source={`${team.totalHours} learning hours in total`}
            >
              <p className="nx-micro text-[10.5px] text-ink-3">Grow into</p>
              <p className="mt-1 text-[15px] leading-snug font-medium">
                {role.label}
              </p>
              <p className="mt-3 font-mono text-[34px] leading-none font-semibold">
                {team.members.length}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                people · fit {team.avgScore} · ~{team.avgWeeks} weeks
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {team.members.map((member) => (
                  <button
                    key={member.employee.id}
                    onClick={() => onSelect(member.employee.id)}
                    title={`${member.employee.consent ? member.employee.name : "Not shared"} · ${member.employee.title}`}
                    className="nx-focus grid size-7 place-items-center rounded-full font-mono text-[9.5px] font-semibold text-white transition-transform hover:scale-110"
                    style={{ background: colors.get(member.employee.dept) }}
                  >
                    {member.employee.consent
                      ? initials(member.employee.name)
                      : "··"}
                  </button>
                ))}
              </div>
            </Box>
          );
        })}
      </div>

      <div>
        <p className="nx-micro text-[11px] text-ink-3">
          Who could fill each growing role
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {growing.map(({ role, candidates }) => (
            <Box key={role.id}>
              <p className="text-[14.5px] leading-snug font-medium">
                {role.label}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {candidates.map(({ insight, match }) => (
                  <li key={insight.employee.id}>
                    <button
                      onClick={() => onSelect(insight.employee.id)}
                      className="nx-focus flex w-full items-center gap-2 text-left text-[12.5px] hover:underline"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background: colors.get(insight.employee.dept),
                        }}
                      />
                      <span className="flex-1 truncate">
                        {insight.employee.consent
                          ? shortName(insight.employee.name)
                          : "Not shared"}
                      </span>
                      <span className="font-mono text-[11.5px] text-ink-2">
                        {match.score}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Box>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Fairness */

export function FairnessCards({ reports }: { reports: FairnessReport[] }) {
  const palette = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#e87ba4"];
  return (
    <div className="space-y-4">
      <div>
        <Micro>05 · Fairness</Micro>
        <p className="mt-1 text-[13px] text-ink-3">
          Gender and age are never used for matching — only to check the results
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => {
          const max = Math.max(
            1,
            ...report.groups.map((group) => group.avgBestScore),
          );
          return (
            <Box
              key={report.dimension}
              source="Average best-match score per group"
            >
              <p className="nx-micro text-[11px] text-ink-3">
                {report.dimension}
              </p>
              <p
                className={cn(
                  "mt-2 font-mono text-[34px] leading-none font-semibold",
                  report.flagged ? "text-auto" : "text-human",
                )}
              >
                {report.scoreGap} pts
              </p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                {report.flagged ? "gap — review before acting" : "gap — pass"}
              </p>
              <div className="mt-3 space-y-2">
                {report.groups.map((group, index) => (
                  <div key={group.group} className="flex items-center gap-2">
                    <span className="w-[62px] truncate text-[11.5px] text-ink-2">
                      {group.group}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(group.avgBestScore / max) * 100}%`,
                          background: palette[index % palette.length],
                        }}
                      />
                    </span>
                    <span className="w-6 text-right font-mono text-[11.5px]">
                      {group.avgBestScore}
                    </span>
                  </div>
                ))}
              </div>
            </Box>
          );
        })}
        <Box source="Inputs to matching">
          <p className="nx-micro text-[11px] text-ink-3">Matching uses</p>
          <p className="mt-2 font-mono text-[34px] leading-none font-semibold text-[#2a78d6]">
            Skills
          </p>
          <p className="mt-1 text-[12.5px] text-ink-2">and job demand only</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
            {["Gender", "Age", "Race", "Religion"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-line px-2 py-0.5 text-ink-3 line-through"
              >
                {item}
              </span>
            ))}
          </div>
        </Box>
        <Box source="Rule for a fair plan">
          <p className="nx-micro text-[11px] text-ink-3">
            Flag when a gap is over
          </p>
          <p className="mt-2 font-mono text-[34px] leading-none font-semibold text-assist">
            10 pts
          </p>
          <p className="mt-1 text-[12.5px] text-ink-2">
            between any two groups
          </p>
        </Box>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- SDG report */

export function SdgCards({
  rows,
  learners,
}: {
  rows: { goal: number; people: number; targets: string[] }[];
  learners: number;
}) {
  const max = Math.max(1, ...rows.map((row) => row.people));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Micro>06 · SDG report</Micro>
          <p className="mt-1 text-[13px] text-ink-3">
            {learners} people on reskilling pathways · counted by the UN targets
            their next roles advance
          </p>
        </div>
        <button
          className="nx-micro nx-focus inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-4 text-[11px] hover:border-ink"
          onClick={() => window.print()}
        >
          Print / save PDF
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => {
          const info = goal(row.goal);
          return (
            <Box key={row.goal} source={`UN SDG ${row.goal}`}>
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg font-mono text-[15px] font-bold text-white"
                  style={{ background: info.color }}
                >
                  {row.goal}
                </span>
                <p className="text-[13.5px] leading-tight font-medium">
                  {info.name}
                </p>
              </div>
              <p
                className="mt-3 font-mono text-[34px] leading-none font-semibold"
                style={{ color: info.color }}
              >
                {row.people}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-2">people advance it</p>
              <span className="mt-3 block h-2.5 overflow-hidden rounded-full bg-stone">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(row.people / max) * 100}%`,
                    background: info.color,
                  }}
                />
              </span>
              <div className="mt-3 flex flex-wrap gap-1">
                {row.targets.map((target) => (
                  <span
                    key={target}
                    title={SDG_TARGETS[target]}
                    className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-2"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </Box>
          );
        })}
      </div>
    </div>
  );
}
