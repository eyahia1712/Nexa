"use client";

import { useEffect, useState } from "react";

import { BTN_SAFFRON, Micro } from "@/components/ui/bits";
import { SKILL_BY_ID, type Occupation, type Task } from "@/lib/catalog";
import type { RoleMatch } from "@/lib/engine/match";
import type { SkillMomentum } from "@/lib/engine/momentum";
import { coursesFor } from "@/lib/engine/courses";
import { SCENARIOS, taskShift, type ScenarioId } from "@/lib/engine/scenarios";
import type { Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

/**
 * Task X-Ray as a dashboard: four headline tiles, a map of every task (sized
 * by importance, coloured by how AI is used on it today), a detail panel for
 * the task you pick, and the 2030 picture under three scenarios.
 */

type Mode = "auto" | "assist" | "human";

const MODES: Record<Mode, { label: string; hint: string; plain: string; color: string; soft: string }> = {
  auto: { label: "AI takes over", hint: "People hand these to AI", plain: "handed to AI", color: "#CE2C2C", soft: "#FCE9E7" },
  assist: { label: "AI assists", hint: "People do these with AI", plain: "done with AI's help", color: "#D48A00", soft: "#FFF2D6" },
  human: { label: "Human-led", hint: "No real AI use yet", plain: "still fully human", color: "#0E7A4B", soft: "#E3F3EA" },
};


/** Split of the job's task time by 2030 in a scenario. */
export function taskTimeSplit(occupation: Occupation, scenario: ScenarioId) {
  const shifted = taskShift(occupation, SCENARIOS[scenario]).value;
  return { human: 1 - shifted, assist: shifted * (1 - occupation.automateShare), auto: shifted * occupation.automateShare };
}

const UPGRADE_SKILLS = ["genai", "ai_agents", "data_analysis", "ai_ethics"];

export interface PlanTarget {
  label: string;
  weeks: number;
}

export function TaskXRay({
  profile,
  occupation,
  target,
  momentum,
  matches,
  scenario,
  onPickRole,
  onRemoveRole,
  onPathway,
  onNext,
}: {
  profile: Profile;
  occupation: Occupation;
  /** The role the person chose in Future roles, once they have. */
  target: PlanTarget | null;
  momentum: Map<string, SkillMomentum>;
  matches: RoleMatch[];
  scenario: ScenarioId;
  onPickRole: () => void;
  onRemoveRole: () => void;
  onPathway: () => void;
  onNext: () => void;
}) {
  const upgrade = UPGRADE_SKILLS.filter((id) => (profile.skills[id] ?? 0) < 2).slice(0, 3);

  return (
    <div className="space-y-4">
      <header>
        <Micro>01 · Dashboard</Micro>
        <h2 className="mt-1.5 text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-medium tracking-[-0.02em]">
          What AI means for {profile.name === "You" ? "your" : `${profile.name}'s`} job today.
        </h2>
        {occupation.declineNote ? (
          <p title={occupation.declineNote} className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]" style={{ borderColor: MODES.assist.color, color: MODES.assist.color }}>
            ⚠ Also shrinking for reasons beyond AI · WEF 2025
          </p>
        ) : null}
      </header>

      {/* My plan: today → next role → pathway */}
      <div className="grid overflow-hidden rounded-2xl border border-line-strong/60 bg-card shadow-[0_14px_34px_-26px_rgb(0_0_0/45%)] sm:grid-cols-3">
        <PlanStep n="1" color="#2F6BFF" label="Today" value={occupation.label} />
        <PlanStep
          n="2"
          color="#DD1367"
          label="Next role"
          value={target?.label ?? "Pick a role"}
          empty={!target}
          onClick={onPickRole}
          onRemove={target ? onRemoveRole : undefined}
          className="border-t border-line sm:border-t-0 sm:border-l"
        />
        <PlanStep
          n="3"
          color="#0E7A4B"
          label="Pathway"
          value={target ? `~${target.weeks} week${target.weeks === 1 ? "" : "s"}` : "Build pathway"}
          empty={!target}
          onClick={target ? onPathway : onPickRole}
          className="border-t border-line sm:border-t-0 sm:border-l"
        />
      </div>

      <JobStats profile={profile} occupation={occupation} scenario={scenario} momentum={momentum} />

      <SkillsBoard profile={profile} momentum={momentum} matches={matches} />

      <Tile className="p-4">
        <p className="text-[15px] font-medium">Stay in this role? Add these</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {upgrade.map((id, index) => {
            const course = coursesFor(id, 1)[0];
            return (
              <a
                key={id}
                href={course?.url}
                target="_blank"
                rel="noreferrer"
                className="nx-focus flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-ink"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold text-white" style={{ background: ["#2F6BFF", "#DD1367", "#4C9F38"][index] }}>
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{SKILL_BY_ID.get(id)?.label}</span>
                  {course ? (
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {course.provider} · {course.hours}h · {course.cost === "free" ? "free" : course.cost === "audit" ? "free to audit" : "paid"}
                    </span>
                  ) : null}
                </span>
                <span className="text-ink-3">↗</span>
              </a>
            );
          })}
          {upgrade.length === 0 ? <p className="text-[13px] text-ink-3">Already working alongside AI.</p> : null}
        </div>
      </Tile>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-ink-3">O*NET {occupation.soc} · Anthropic Economic Index (Mar 2026) · estimate, not a prediction about you</p>
        <button className={BTN_SAFFRON} onClick={onNext}>
          Next: Skills Radar →
        </button>
      </div>
    </div>
  );
}

function PlanStep({
  n,
  color,
  label,
  value,
  empty = false,
  onClick,
  onRemove,
  className,
}: {
  n: string;
  color: string;
  label: string;
  value: string;
  empty?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full font-mono text-[13px] font-semibold text-white" style={{ background: empty ? "var(--line-strong)" : color }}>
        {n}
      </span>
      <span className="min-w-0">
        <span className="nx-micro block text-[10.5px] text-ink-3">{label}</span>
        <span className={cn("line-clamp-2 block text-[15px] leading-snug font-medium", empty && "text-ink-3")}>
          {value}
          {empty ? " →" : ""}
        </span>
      </span>
    </>
  );
  if (onClick && onRemove) {
    return (
      <div className={cn("relative flex items-center", className)}>
        <button onClick={onClick} className="nx-focus flex flex-1 items-center gap-3 px-4 py-3.5 pr-11 text-left transition-colors hover:bg-paper-2">
          {body}
        </button>
        <button
          onClick={onRemove}
          aria-label="Remove next role"
          title="Remove next role"
          className="nx-focus absolute right-3 grid size-7 place-items-center rounded-full border border-line bg-card text-[14px] text-ink-3 transition-colors hover:border-auto hover:text-auto"
        >
          ×
        </button>
      </div>
    );
  }
  return onClick ? (
    <button onClick={onClick} className={cn("nx-focus flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-paper-2", className)}>
      {body}
    </button>
  ) : (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>{body}</div>
  );
}

function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line-strong/60 bg-card p-5 shadow-[0_14px_34px_-26px_rgb(0_0_0/45%)]", className)}>{children}</div>;
}

/* ----------------------------------------------------------------------------
   Your skills in the AI era: every skill as a coloured dot. Pick one to see a
   plain verdict and, where it helps, what to learn and where.
---------------------------------------------------------------------------- */

type Verdict = "future" | "steady" | "changing";

const VERDICT: Record<Verdict, { label: string; color: string; advice: string }> = {
  future: { label: "Future-proof", color: "#0E7A4B", advice: "Rising, and AI can't do it for you." },
  steady: { label: "Holding steady", color: "#2F6BFF", advice: "Still valued. Keep it sharp." },
  changing: { label: "AI is changing it", color: "#CE2C2C", advice: "AI is taking on this work. Pair it with a rising skill." },
};

interface SkillRow {
  id: string;
  level: 1 | 2 | 3;
  m: SkillMomentum;
  verdict: Verdict;
}

const verdictOf = (m: SkillMomentum): Verdict => (m.skill.routineSoc !== null || m.band === "declining" ? "changing" : m.score >= 56 ? "future" : "steady");

function SkillsBoard({ profile, momentum, matches }: { profile: Profile; momentum: Map<string, SkillMomentum>; matches: RoleMatch[] }) {
  const rows: SkillRow[] = Object.entries(profile.skills)
    .map(([id, level]) => ({ id, level, m: momentum.get(id) }))
    .filter((row): row is { id: string; level: 1 | 2 | 3; m: SkillMomentum } => row.m !== undefined)
    .map((row) => ({ ...row, verdict: verdictOf(row.m) }))
    .sort((a, b) => b.m.score - a.m.score);
  const [picked, setPicked] = useState<string>(rows[0]?.id ?? "");
  const selected = rows.find((row) => row.id === picked) ?? rows[0];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Tile className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] font-medium">Your skills in the AI era</p>
          <p className="text-[12px] text-ink-3">Tap a skill</p>
        </div>
        <ul className="mt-3">
          {rows.map((row) => {
            const active = row.id === selected?.id;
            const color = VERDICT[row.verdict].color;
            return (
              <li key={row.id}>
                <button onClick={() => setPicked(row.id)} className="nx-focus group flex w-full items-center gap-3 border-b border-line/70 py-2.5 text-left">
                  <span
                    className={cn("shrink-0 rounded-full transition-all duration-300", active ? "size-4 ring-4" : "size-3.5 group-hover:scale-125")}
                    style={{ background: color, ["--tw-ring-color" as string]: `color-mix(in srgb, ${color} 22%, white)` }}
                  />
                  <span className={cn("min-w-0 flex-1 truncate text-[14px] transition-colors", active ? "font-semibold text-ink" : "text-ink-2 group-hover:text-ink")}>
                    {row.m.skill.label.split(" (")[0]}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color }}>
                    {VERDICT[row.verdict].label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Tile>
      {selected ? <SkillVerdict key={selected.id} row={selected} matches={matches} momentum={momentum} profile={profile} /> : null}
    </div>
  );
}

const COST = { free: "free", audit: "free to audit", paid: "paid", employer: "employer-funded" } as const;

function SkillVerdict({ row, matches, momentum, profile }: { row: SkillRow; matches: RoleMatch[]; momentum: Map<string, SkillMomentum>; profile: Profile }) {
  const verdict = VERDICT[row.verdict];
  const roles = matches.filter((match) => match.role.skills.some((need) => need.id === row.id)).slice(0, 3);

  // What to learn, specific to this skill:
  //  · AI is changing it → one course that upgrades the skill itself, plus one
  //    for the closest rising skill next to it (its own related skills first).
  //  · worth growing    → two courses for the skill itself.
  //  · strong already   → nothing to buy; keep using it.
  const picks: { course: ReturnType<typeof coursesFor>[number]; tag: string }[] = [];
  // Real course links only, and courses made for this skill before shared ones.
  const linksFor = (id: string, max: number) =>
    coursesFor(id, 5)
      .filter((course) => course.cost !== "employer")
      .sort((a, b) => Number(b.skills[0] === id) - Number(a.skills[0] === id))
      .slice(0, max);
  if (row.verdict === "changing") {
    const own = linksFor(row.id, 1);
    const nearby = row.m.skill.related
      .filter((id) => (profile.skills[id] ?? 0) < 2)
      .map((id) => momentum.get(id))
      .filter((m): m is SkillMomentum => m !== undefined && m.skill.routineSoc === null && linksFor(m.skill.id, 1).length > 0)
      .sort((a, b) => b.score - a.score);
    const fallback = ["genai", "data_analysis", "ai_agents"].map((id) => momentum.get(id)).filter((m): m is SkillMomentum => m !== undefined && (profile.skills[m.skill.id] ?? 0) < 2);
    // No rising neighbour: rotate the general AI-era skills so each skill gets its own suggestion.
    const spread = [...row.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const next = nearby[0] ?? fallback[spread % Math.max(1, fallback.length)];
    if (own[0]) picks.push({ course: own[0], tag: "Upgrade it" });
    if (next) {
      for (const course of linksFor(next.skill.id, own[0] ? 1 : 2)) picks.push({ course, tag: `Learn next · ${next.skill.label.split(" (")[0]}` });
    }
  } else if (row.level < 3) {
    for (const course of linksFor(row.id, 2)) picks.push({ course, tag: "Grow it" });
  }

  return (
    <div className="nx-rise overflow-hidden rounded-2xl border border-line-strong/60 bg-card shadow-[0_14px_34px_-26px_rgb(0_0_0/45%)] xl:sticky xl:top-20">
      <div className="px-5 py-4 text-white" style={{ background: verdict.color }}>
        <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase opacity-85">{row.m.skill.label.split(" (")[0]}</p>
        <p className="mt-1 text-[24px] leading-tight font-semibold">{verdict.label}</p>
        <p className="mt-1 text-[13px] opacity-90">{verdict.advice}</p>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div>
          <div className="flex justify-between text-[12px] text-ink-2">
            <span>Demand for this skill</span>
            <span className="font-mono">{row.m.score}/100</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone">
            <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${row.m.score}%`, background: verdict.color }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-ink-2">
            <span>Your level</span>
            <span className="font-medium">{["Basic", "Working", "Strong"][row.level - 1]}</span>
          </div>
        </div>

        {roles.length > 0 ? (
          <div>
            <p className="nx-micro text-[10.5px] text-ink-3">Opens doors to</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {roles.map((match) => (
                <span key={match.role.id} className="rounded-full border border-line px-2.5 py-1 text-[12px]">
                  {match.role.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t border-line pt-4">
          {picks.length === 0 ? (
            <p className="flex items-center gap-2 text-[14px] font-medium" style={{ color: verdict.color }}>
              ★ A strength. Keep using it.
            </p>
          ) : (
            <div className="space-y-1.5">
              {picks.map(({ course, tag }) => (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="nx-focus flex items-center gap-3 rounded-lg border border-line px-3 py-2 transition-colors hover:border-ink"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-medium tracking-wide uppercase" style={{ color: tag === "Upgrade it" || tag === "Grow it" ? verdict.color : "#0E7A4B" }}>
                      {tag}
                    </span>
                    <span className="block truncate text-[13px] font-medium">{course.title}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {course.provider} · {course.hours}h · {COST[course.cost]}
                    </span>
                  </span>
                  <span className="text-ink-3">↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Three small numbers about this person, drawn like the landing page's
   problem cards: work hours with AI by 2030, tasks AI already helps with,
   and skills that carry them forward. Each animates in.
---------------------------------------------------------------------------- */

const modeOf = (task: Task): Mode => (task.mode === "automate" ? "auto" : task.mode === "assist" ? "assist" : "human");

function useCount(target: number, ms = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function useShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return shown;
}

/** Official UN SDG colours, as on the landing page's 600k card. */
const SDG_DOTS = ["#E5243B", "#DDA63A", "#4C9F38", "#C5192D", "#FF3A21", "#26BDE2", "#FCC30B", "#A21942", "#FD6925", "#DD1367", "#FD9D24", "#BF8B2E", "#3F7E44", "#0A97D9", "#56C02B", "#00689D", "#19486A", "#111110"];

function JobStats({ profile, occupation, scenario, momentum }: { profile: Profile; occupation: Occupation; scenario: ScenarioId; momentum: Map<string, SkillMomentum> }) {
  const shown = useShown();
  const shift = taskShift(occupation, SCENARIOS[scenario]).value;
  const tasks = occupation.tasks;
  const withAi = tasks.filter((task) => modeOf(task) !== "human").length;
  const skills = Object.keys(profile.skills)
    .map((id) => momentum.get(id))
    .filter((m): m is SkillMomentum => m !== undefined);
  const forward = skills.filter((m) => verdictOf(m) !== "changing").length;

  const pct = useCount(Math.round(shift * 100));
  const taskCount = useCount(withAi);
  const skillCount = useCount(forward);
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard source={`By 2030 · ${SCENARIOS[scenario].short} scenario`}>
        <p className="font-mono text-[32px] leading-none font-semibold text-[#E5243B]">{pct}%</p>
        <p className="mt-2 text-[13px] leading-snug text-ink-2">of the work done with AI</p>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--human)_18%,white)]">
          <span className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: shown ? `${shift * 100}%` : "0%", background: "linear-gradient(90deg,#FCC30B,#FD6925,#E5243B)" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-auto" /> with AI
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-human" /> people
          </span>
        </div>
      </StatCard>

      <StatCard source="Today · main tasks">
        <p className="font-mono text-[32px] leading-none font-semibold">
          <span className="text-[#D48A00]">{taskCount}</span>
          <span className="text-[20px] text-ink-3">/{tasks.length}</span>
        </p>
        <p className="mt-2 text-[13px] leading-snug text-ink-2">tasks AI already helps with</p>
        <div className="mt-4 grid grid-cols-12 gap-1" aria-hidden>
          {tasks.map((task, index) => {
            const mode = modeOf(task);
            return (
              <span
                key={task.id}
                title={MODES[mode].label}
                className="aspect-square rounded-full transition-all duration-500"
                style={{
                  background: shown ? SDG_DOTS[(index * 7) % SDG_DOTS.length] : "var(--stone)",
                  transform: shown ? "scale(1)" : "scale(0.4)",
                  transitionDelay: `${index * 45}ms`,
                }}
              />
            );
          })}
        </div>
      </StatCard>

      <StatCard source="Your skills · AI-era check">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--stone)" strokeWidth="9" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="url(#js-ring)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={shown ? c * (1 - forward / Math.max(1, skills.length)) : c}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
            />
            <defs>
              <linearGradient id="js-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#26BDE2" />
                <stop offset="100%" stopColor="#2F6BFF" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <p className="font-mono text-[32px] leading-none font-semibold">
              <span className="text-[#2F6BFF]">{skillCount}</span>
              <span className="text-[20px] text-ink-3">/{skills.length}</span>
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-2">skills carry you forward</p>
          </div>
        </div>
      </StatCard>
    </div>
  );
}

function StatCard({ children, source }: { children: React.ReactNode; source: string }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line-strong/60 bg-card p-4 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex-1">{children}</div>
      <p className="mt-3 text-[10.5px] text-ink-3">{source}</p>
    </article>
  );
}
