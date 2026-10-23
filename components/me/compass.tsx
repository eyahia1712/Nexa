"use client";

import { useEffect, useMemo } from "react";

import { BTN_SAFFRON, Card, Micro, SdgTarget, SdgTile } from "@/components/ui/bits";
import { SDG_GOALS, goal } from "@/lib/catalog";
import { matchRoles, type RoleMatch } from "@/lib/engine/match";
import type { SkillMomentum } from "@/lib/engine/momentum";
import type { ScenarioId } from "@/lib/engine/scenarios";
import { saveProfile, type Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function ImpactCompass({
  profile,
  momentum,
  scenario,
  weight,
  onWeight,
  onProfile,
  chosen,
  onPlan,
}: {
  profile: Profile;
  momentum: Record<ScenarioId, Map<string, SkillMomentum>>;
  scenario: ScenarioId;
  weight: number;
  onWeight: (value: number) => void;
  onProfile: (profile: Profile) => void;
  chosen: RoleMatch | null;
  onPlan: (roleId: string) => void;
}) {
  const fitOnly = useMemo(() => matchRoles(profile, momentum, scenario, 0), [profile, momentum, scenario]);
  const withImpact = useMemo(() => matchRoles(profile, momentum, scenario, Math.max(weight, 0.0001)), [profile, momentum, scenario, weight]);
  const fitRank = new Map(fitOnly.map((match, index) => [match.role.id, index + 1]));

  // Opening the compass turns impact on, so the effect of the Goals is visible at once.
  useEffect(() => {
    if (weight === 0) onWeight(0.6);
    // Only on first open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (n: number) => {
    const has = profile.sdgPriorities.includes(n);
    const next = { ...profile, sdgPriorities: has ? profile.sdgPriorities.filter((item) => item !== n) : [...profile.sdgPriorities, n].slice(-3) };
    onProfile(next);
    saveProfile(next);
  };

  return (
    <div className="space-y-5">
      <header>
        <Micro>05 · SDG mapping · Impact Compass</Micro>
        <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">Let the goals you care about change your choice.</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">
          Every role is tagged to specific UN targets, with a reason. Pick up to three Goals and decide how much impact should count. Roles that advance them move up — and you can see exactly how
          far.
        </p>
      </header>

      <Card className="p-5">
        <p className="text-[14px] font-medium">Goals you care about</p>
        <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-[repeat(17,minmax(0,1fr))]">
          {SDG_GOALS.map((item) => {
            const on = profile.sdgPriorities.includes(item.n);
            return (
              <button
                key={item.n}
                onClick={() => toggle(item.n)}
                title={item.name}
                aria-pressed={on}
                className={cn("nx-focus rounded-md transition-all", on ? "scale-105 ring-2 ring-ink ring-offset-2" : "opacity-40 hover:opacity-80")}
              >
                <SdgTile n={item.n} size={36} />
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-ink-2">
          {profile.sdgPriorities.length === 0 ? "No goals chosen yet." : profile.sdgPriorities.map((n) => `SDG ${n} ${goal(n).name}`).join(" · ")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <p className="text-[14px] font-medium">How much should impact count?</p>
          <input type="range" min={0} max={100} value={Math.round(weight * 100)} onChange={(event) => onWeight(Number(event.target.value) / 100)} className="w-56 accent-[var(--ink)]" />
          <span className="font-mono text-[15px]">{Math.round(weight * 100)}%</span>
          <span className="text-[12.5px] text-ink-3">0% = rank by fit and demand only · 100% = up to +30% for roles that advance your Goals</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_90px_80px] gap-3 border-b border-line bg-paper-2 px-5 py-2.5">
          <p className="nx-micro text-[11px] text-ink-3">Rank</p>
          <p className="nx-micro text-[11px] text-ink-3">Role and its Goals</p>
          <p className="nx-micro text-right text-[11px] text-ink-3">Moved</p>
          <p className="nx-micro text-right text-[11px] text-ink-3">Score</p>
        </div>
        <ul>
          {withImpact.slice(0, 10).map((match, index) => {
            const before = fitRank.get(match.role.id) ?? index + 1;
            const moved = before - (index + 1);
            return (
              <li key={match.role.id} className="grid grid-cols-[48px_1fr_90px_80px] items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <p className="font-mono text-[14px]">#{index + 1}</p>
                <div className="min-w-0">
                  <button onClick={() => onPlan(match.role.id)} className="nx-focus text-left text-[15px] font-medium underline-offset-4 hover:underline">
                    {match.role.label}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {match.sdgGoals.map((n) => (
                      <span key={n} className={cn(profile.sdgPriorities.includes(n) ? "" : "opacity-40")}>
                        <SdgTile n={n} size={20} />
                      </span>
                    ))}
                    <span className="ml-1 font-mono text-[11px] text-ink-3">{match.role.sdg.map((tag) => tag.target).join(" · ")}</span>
                  </div>
                </div>
                <p className={cn("text-right font-mono text-[13px]", moved > 0 ? "text-human" : moved < 0 ? "text-auto" : "text-ink-3")}>
                  {moved > 0 ? `▲ ${moved}` : moved < 0 ? `▼ ${-moved}` : "—"}
                </p>
                <p className="text-right font-mono text-[15px]">{weight > 0 ? match.impactScore : match.score}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      {chosen ? (
        <Card className="p-5">
          <p className="text-[15px] font-medium">My SDG contribution · if I become a {chosen.role.label}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {chosen.role.sdg.map((tag) => (
              <SdgTarget key={tag.target} target={tag.target} why={tag.why} />
            ))}
            <SdgTarget target="4.4" why="By reskilling, you add one more adult with relevant skills for decent work." />
            <SdgTarget target="8.5" why="Moving to a growing role before a shrinking one disappears keeps work productive and decent." />
          </div>
          <button className={cn(BTN_SAFFRON, "mt-5")} onClick={() => onPlan(chosen.role.id)}>
            See the pathway
          </button>
        </Card>
      ) : null}
    </div>
  );
}
