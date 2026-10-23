"use client";

import { useEffect, useMemo, useState } from "react";

import { BTN_GHOST, BTN_SAFFRON, Card, Chip, Micro, SdgTarget, SourceLine } from "@/components/ui/bits";
import { HRDCORP, LINK_CHECK, SKILL_BY_ID } from "@/lib/catalog";
import type { RoleMatch } from "@/lib/engine/match";
import { buildPathway } from "@/lib/engine/pathway";
import type { Profile } from "@/lib/profile";
import { cn, formatDate } from "@/lib/utils";

const REASON: Record<string, { label: string; tone: "auto" | "assist" | "plain" | "saffron" }> = {
  prerequisite: { label: "Foundation first", tone: "saffron" },
  core: { label: "Essential", tone: "auto" },
  important: { label: "Important", tone: "assist" },
  helpful: { label: "Helpful extra", tone: "plain" },
};

const COST: Record<string, string> = { free: "Free", audit: "Free to audit", paid: "Paid certificate", employer: "Employer-funded (HRD Corp)" };

export function PathwayView({
  profile,
  match,
  matches,
  onPick,
  onNext,
}: {
  profile: Profile;
  match: RoleMatch;
  matches: RoleMatch[];
  onPick: (roleId: string) => void;
  onNext: () => void;
}) {
  const pathway = useMemo(() => buildPathway(match, profile), [match, profile]);
  const storageKey = `nexa.progress.${profile.id}.${match.role.id}`;
  const [done, setDone] = useState<string[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setDone(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]);
    } catch {
      setDone([]);
    }
  }, [storageKey]);

  const toggle = (skillId: string) => {
    const next = done.includes(skillId) ? done.filter((id) => id !== skillId) : [...done, skillId];
    setDone(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Progress is a convenience; it is fine if storage is unavailable.
    }
  };

  const progress = pathway.steps.length === 0 ? 1 : done.filter((id) => pathway.steps.some((step) => step.skillId === id)).length / pathway.steps.length;

  return (
    <div className="space-y-5">
      <header>
        <Micro>04 · Personalised reskilling pathway</Micro>
        <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">Your route to {match.role.label}.</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          Foundations first, then the essentials. Every course is real, from Nexa&apos;s catalogue, and its link was checked on {formatDate(LINK_CHECK.checkedOn)}. The timeline fits your{" "}
          {profile.hoursPerWeek} hours a week. Change anything — it&apos;s your plan.
        </p>
      </header>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <label className="flex items-center gap-2 text-[14px]">
          <span className="text-ink-3">Target role</span>
          <select value={match.role.id} onChange={(event) => onPick(event.target.value)} className="nx-focus h-10 rounded-lg border border-line bg-card px-3 text-[14px]">
            {matches.slice(0, 10).map((item, index) => (
              <option key={item.role.id} value={item.role.id}>
                #{index + 1} {item.role.label} · {item.score}
              </option>
            ))}
          </select>
        </label>
        <button className={cn(BTN_GHOST, "ml-auto min-h-9")} onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </Card>

      {match.role.entry.barrier !== "open" && match.points.barrier !== 0 ? (
        <div className="rounded-xl border border-assist/40 bg-[color-mix(in_srgb,var(--assist)_8%,white)] p-4 text-[14px] leading-snug">
          <span className="nx-micro mr-2 text-assist">{match.role.entry.barrier === "licence" ? "Licensed profession" : "Degree usually expected"}</span>
          {match.role.entry.note} The steps below build the skills; the formal route takes longer and is not counted in the timeline.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total time", `${pathway.totalWeeks} wk`, `${pathway.totalHours} learning hours`],
          ["Steps", String(pathway.steps.length), "skills to build"],
          ["Free or audit", `${Math.round(pathway.freeShare * 100)}%`, "of first-choice courses"],
          ["Progress", `${Math.round(progress * 100)}%`, `${done.length} badge${done.length === 1 ? "" : "s"} earned`],
        ].map(([label, value, note]) => (
          <Card key={label} className="p-4">
            <p className="nx-micro text-[11px] text-ink-3">{label}</p>
            <p className="mt-1 font-mono text-[26px] leading-none">{value}</p>
            <p className="mt-1 text-[12px] text-ink-3">{note}</p>
          </Card>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone">
        <div className="h-full rounded-full bg-human transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      {pathway.steps.length === 0 ? (
        <Card className="p-6 text-[15px]">You already hold every skill this role needs at working level. Your next step is applying — and the human core on the left is your story.</Card>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-dashed border-line-strong pl-6">
          {pathway.steps.map((step, index) => {
            const skill = SKILL_BY_ID.get(step.skillId);
            const isDone = done.includes(step.skillId);
            const picked = step.courses.find((course) => course.id === choice[step.skillId]) ?? step.courses[0];
            return (
              <li key={step.skillId} className="relative">
                <span
                  className={cn(
                    "absolute top-5 -left-[35px] grid size-6 place-items-center rounded-full border-2 font-mono text-[11px]",
                    isDone ? "border-human bg-human text-white" : "border-ink bg-paper text-ink",
                  )}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <Card className={cn("p-5", isDone && "border-human")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[12px] text-ink-3">
                        Week {step.startWeek}
                        {step.endWeek > step.startWeek ? `–${step.endWeek}` : ""} · ~{step.hours}h
                      </p>
                      <p className="mt-1 text-[17px] font-medium">{skill?.label}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip tone={REASON[step.reason]!.tone}>{REASON[step.reason]!.label}</Chip>
                        {step.have > 0 ? <Chip>You have the basics</Chip> : null}
                        {step.bridge ? <Chip tone="human">Builds on {SKILL_BY_ID.get(step.bridge)?.label}</Chip> : null}
                      </div>
                    </div>
                    <button onClick={() => toggle(step.skillId)} className={cn(isDone ? BTN_GHOST : "nx-micro nx-focus inline-flex min-h-9 items-center gap-2 rounded-md border border-human px-3 text-human")}>
                      {isDone ? "Undo" : "Mark done · earn badge"}
                    </button>
                  </div>

                  {picked ? (
                    <div className="mt-4 rounded-lg border border-line bg-paper-2/60 p-3">
                      <a href={picked.url} target="_blank" rel="noreferrer" className="text-[14.5px] font-medium underline-offset-4 hover:underline">
                        {picked.title} ↗
                      </a>
                      <p className="mt-0.5 text-[12.5px] text-ink-2">
                        {picked.provider} · {picked.approx ? "about " : ""}
                        {picked.hours}h · {COST[picked.cost]} {picked.verified ? "· link verified" : ""}
                      </p>
                      {step.courses.length > 1 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-[12px] text-ink-3">Or:</span>
                          {step.courses
                            .filter((course) => course.id !== picked.id)
                            .map((course) => (
                              <button
                                key={course.id}
                                onClick={() => setChoice((current) => ({ ...current, [step.skillId]: course.id }))}
                                className="nx-focus rounded-full border border-line bg-card px-2.5 py-0.5 text-[12px] text-ink-2 hover:border-line-strong"
                              >
                                {course.title}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {step.sdgTargets.length > 0 ? <p className="mt-3 font-mono text-[11.5px] text-ink-3">Advances SDG {step.sdgTargets.join(" · ")}</p> : null}
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-[15px] font-medium">How {match.role.label} contributes to the Goals</p>
          <div className="mt-3 space-y-3">
            {match.role.sdg.map((tag) => (
              <SdgTarget key={tag.target} target={tag.target} why={tag.why} />
            ))}
            <SdgTarget target="4.4" why="Every step of this pathway adds a relevant skill for decent work — you become part of the 4.4 count." />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] font-medium">If your employer pays</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Malaysian employers registered with HRD Corp can fund training through HRD Corp-registered providers. Show your manager this pathway and search the provider catalogue for the same
            skills.
          </p>
          <a href={HRDCORP.url} target="_blank" rel="noreferrer" className={cn(BTN_GHOST, "mt-3")}>
            Open HRD Corp ↗
          </a>
          <SourceLine className="mt-3">Nexa never claims a course is HRD Corp-claimable; eligibility is confirmed with the provider.</SourceLine>
        </Card>
      </div>

      <div className="flex justify-end">
        <button className={BTN_SAFFRON} onClick={onNext}>
          Next: choose with impact →
        </button>
      </div>
    </div>
  );
}
