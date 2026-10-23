"use client";

import { useEffect, useState } from "react";

import { BTN_GHOST, BTN_SAFFRON, Card, Chip, EstimateNote, Micro, SdgTile, SourceLine } from "@/components/ui/bits";
import { OCCUPATIONS, ROLE_SOURCES, SKILL_BY_ID } from "@/lib/catalog";
import type { RoleMatch } from "@/lib/engine/match";
import { SCENARIOS, SCENARIO_ORDER, type ScenarioId } from "@/lib/engine/scenarios";
import { cn } from "@/lib/utils";

export function FutureRoles({
  matches,
  skills,
  scenario,
  sdgWeight,
  chosenId,
  onRemove,
  onPlan,
}: {
  matches: RoleMatch[];
  skills: string[];
  scenario: ScenarioId;
  sdgWeight: number;
  /** The next role the person already chose, if any. */
  chosenId: string | null;
  onRemove: () => void;
  onPlan: (roleId: string) => void;
}) {
  const [shown, setShown] = useState(6);
  const semantic = useSemantic(matches, skills);
  return (
    <div className="space-y-5">
      <header>
        <Micro>03 · Future-role matching</Micro>
        <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">Roles that fit you — with a score you can check by hand.</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          Score = skills you already have (up to 60) + transferable skills (up to 15) + future demand in the {SCENARIOS[scenario].label.toLowerCase()} scenario (up to 25) − entry barrier.
          Only roles from Nexa&apos;s cited catalogue are ever shown. Age, gender and background are never used.
        </p>
        <EstimateNote className="mt-2" />
        {sdgWeight > 0 ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-saffron-soft px-3 py-1.5 text-[13px] text-saffron-deep">
            Impact Compass is on ({Math.round(sdgWeight * 100)}%): roles that advance your Goals are ranked higher. The score shown is the match score.
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        {matches.slice(0, Math.max(shown, chosenId ? matches.findIndex((match) => match.role.id === chosenId) + 1 : 0)).map((match, index) => (
          <RoleCard
            key={match.role.id}
            match={match}
            rank={index + 1}
            semantic={semantic?.scores[match.role.id]}
            chosen={match.role.id === chosenId}
            onRemove={onRemove}
            onPlan={() => onPlan(match.role.id)}
          />
        ))}
      </div>
      {semantic ? (
        <SourceLine>
          Semantic closeness: {semantic.model} on a RunPod GPU ({semantic.device}) — how close your skills are in meaning to each role&apos;s skills. Shown for context; not part of the score.
        </SourceLine>
      ) : null}
      {shown < matches.length ? (
        <button className={BTN_GHOST} onClick={() => setShown(matches.length)}>
          Show all {matches.length} roles
        </button>
      ) : null}
    </div>
  );
}

interface Semantic {
  model: string;
  device: string;
  scores: Record<string, number>;
}

/** Optional: semantic skill closeness from the RunPod GPU endpoint, when configured. */
function useSemantic(matches: RoleMatch[], skills: string[]): Semantic | null {
  const [result, setResult] = useState<Semantic | null>(null);
  const key = `${matches
    .slice(0, 10)
    .map((match) => match.role.id)
    .join(",")}|${skills.join(",")}`;
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const status = (await (await fetch("/api/semantic")).json()) as { enabled: boolean };
      if (!status.enabled || matches.length === 0) return;
      const profile = skills.map((id) => SKILL_BY_ID.get(id)?.label ?? id);
      const roles = Object.fromEntries(matches.slice(0, 10).map((match) => [match.role.id, match.role.skills.map((skill) => SKILL_BY_ID.get(skill.id)?.label ?? skill.id)]));
      const response = await fetch("/api/semantic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, roles }) });
      const body = (await response.json()) as Partial<Semantic> & { error?: string };
      if (!cancelled && body.scores && body.model) setResult({ model: body.model, device: body.device ?? "gpu", scores: body.scores });
    };
    void run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Re-run only when the top roles or the person's skills change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result;
}

function RoleCard({
  match,
  rank,
  semantic,
  chosen,
  onRemove,
  onPlan,
}: {
  match: RoleMatch;
  rank: number;
  semantic?: number;
  chosen: boolean;
  onRemove: () => void;
  onPlan: () => void;
}) {
  const [open, setOpen] = useState(rank === 1);
  const { role, points } = match;
  const occupation = OCCUPATIONS[role.soc];
  const total = Math.max(1, points.skills + points.transfer + points.demand);
  return (
    <Card className={cn("nx-rise overflow-hidden", chosen && "border-saffron ring-2 ring-saffron")} style={{ ["--i" as string]: rank }}>
      <div className="grid gap-4 p-5 md:grid-cols-[56px_1fr_150px]">
        <p className="font-mono text-[13px] text-ink-3">#{rank}</p>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[19px] leading-snug font-medium">{role.label}</h3>
            {chosen ? <Chip tone="saffron">★ Your next role</Chip> : null}
            {match.robust ? <Chip tone="human">Robust in all 3 scenarios</Chip> : null}
            <Chip tone={role.outlook.direction === "growing" ? "saffron" : "plain"}>{role.outlook.direction === "growing" ? "Growing" : "Steady"}</Chip>
            {role.entry.barrier !== "open" ? <Chip tone="assist">{role.entry.barrier === "licence" ? "Licensed profession" : "Degree usually expected"}</Chip> : null}
          </div>
          <p className="mt-1 text-[14px] text-ink-2">{role.summary}</p>

          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-stone" aria-hidden>
            <span className="nx-grow h-full bg-ink" style={{ width: `${(points.skills / 100) * 100}%` }} />
            <span className="nx-grow h-full bg-ink-3" style={{ width: `${(points.transfer / 100) * 100}%` }} />
            <span className="nx-grow h-full bg-saffron" style={{ width: `${(points.demand / 100) * 100}%` }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-ink-2">
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-ink" />
              skills {points.skills}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-ink-3" />
              transferable {points.transfer}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-saffron" />
              demand {points.demand}
            </span>
            {points.barrier !== 0 ? <span className="text-assist">barrier {points.barrier}</span> : null}
            <span className="text-ink-3">= {Math.max(0, total + points.barrier)}</span>
          </p>
        </div>
        <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
          <p className="font-mono text-[40px] leading-none font-semibold">{match.score}</p>
          <p className="text-right text-[12px] text-ink-3">
            {role.entry.barrier === "licence" ? "Formal qualification needed" : match.weeksToReady <= 0 ? "Ready now" : `~${match.weeksToReady} weeks of skills`}
            <br />
            {match.gaps.filter((gap) => gap.core || gap.weight >= 2).length} key gaps
            {semantic !== undefined ? (
              <>
                <br />
                <span className="font-mono text-ink-2">semantic {Math.round(semantic * 100)}%</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <div className="flex items-center gap-1">
          {match.sdgGoals.map((n) => (
            <SdgTile key={n} n={n} size={22} />
          ))}
        </div>
        <span className="font-mono text-[11.5px] text-ink-3">
          rank {SCENARIO_ORDER.map((id) => `${SCENARIOS[id].short[0]}${match.rankByScenario[id]}`).join(" · ")}
        </span>
        <div className="ml-auto flex gap-2">
          <button className={cn(BTN_GHOST, "min-h-9")} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            {open ? "Hide details" : "Why this role?"}
          </button>
          {chosen ? (
            <>
              <button className={cn(BTN_GHOST, "min-h-9 text-auto hover:border-auto")} onClick={onRemove}>
                Remove
              </button>
              <button className={cn(BTN_SAFFRON, "min-h-9")} onClick={onPlan}>
                View pathway
              </button>
            </>
          ) : (
            <button className={cn(BTN_SAFFRON, "min-h-9")} onClick={onPlan}>
              Plan this path
            </button>
          )}
        </div>
      </div>

      {open ? (
        <div className="grid gap-5 border-t border-line bg-paper-2/60 p-5 lg:grid-cols-3">
          <div>
            <p className="text-[13px] font-medium">Skills you bring</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.strengths.length === 0 ? <p className="text-[13px] text-ink-3">None at working level yet.</p> : null}
              {match.strengths.map((id) => (
                <span key={id} className="inline-flex h-7 items-center rounded-full border border-ink bg-ink px-3 text-[12.5px] text-paper">
                  {SKILL_BY_ID.get(id)?.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[13px] font-medium">Skills gap</p>
            <ul className="mt-2 space-y-1.5">
              {match.gaps.map((gap) => (
                <li key={gap.skillId} className="text-[13px] leading-snug">
                  <span className={cn("mr-1.5 inline-block size-2 rounded-full", gap.core ? "bg-auto" : gap.weight >= 2 ? "bg-assist" : "bg-ink-3")} />
                  {SKILL_BY_ID.get(gap.skillId)?.label}
                  <span className="text-ink-3"> · {gap.core ? "essential" : gap.weight >= 2 ? "important" : "helpful"}</span>
                  {gap.have > 0 ? <span className="text-ink-3"> · you have basics</span> : null}
                  {gap.bridge ? <span className="text-human"> · builds on {SKILL_BY_ID.get(gap.bridge)?.label}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-medium">Future demand: {match.demand.score}/100</p>
            <ul className="mt-2 space-y-1">
              {match.demand.parts.map((part) => (
                <li key={part.label} className="flex justify-between gap-3 text-[13px]">
                  <span className="text-ink-2">{part.label}</span>
                  <span className="font-mono">
                    {part.points > 0 && part !== match.demand.parts[0] ? "+" : ""}
                    {part.points}
                  </span>
                </li>
              ))}
            </ul>
            {role.outlook.evidence.map((item) => (
              <div key={item.note} className="mt-3 rounded-lg border border-line bg-card p-3">
                <p className="text-[12.5px] leading-snug">{item.note}</p>
                <SourceLine className="mt-1">
                  <a href={ROLE_SOURCES[item.source]?.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    {ROLE_SOURCES[item.source]?.name}
                  </a>
                </SourceLine>
              </div>
            ))}
            {role.outlook.evidence.length === 0 ? <p className="mt-3 text-[12.5px] text-ink-3">No growth signal for this role in our sources, so it is scored as steady.</p> : null}
          </div>
          <div>
            <p className="text-[13px] font-medium">How much AI changes this role</p>
            <p className="mt-1 font-mono text-[22px]">{Math.round(match.roleShift * 100)}%</p>
            <p className="text-[12.5px] text-ink-3">of its task time done with AI by 2030 in this scenario — you&apos;d be working with AI, not replaced by it.</p>
            {occupation ? <SourceLine className="mt-1">O*NET {occupation.soc} {occupation.title} · Anthropic Economic Index</SourceLine> : null}
            <p className="mt-4 text-[13px] font-medium">How to get in</p>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{role.entry.note}</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
