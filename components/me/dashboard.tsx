"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EvidenceChip, ScenarioSwitch } from "@/components/app/controls";
import { TopBar } from "@/components/app/top-bar";
import { useSignals } from "@/components/app/use-signals";
import { OCCUPATIONS } from "@/lib/catalog";
import { matchRoles } from "@/lib/engine/match";
import { PERSONAS, loadPlan, loadProfile, profileFromPersona, savePlan, type Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

import { WhatChanged } from "./changes";
import { ImpactCompass } from "./compass";
import { PathwayView } from "./pathway";
import { PersonCard } from "./person-card";
import { FutureRoles } from "./roles";
import { SkillsRadar } from "./skills-radar";
import { TaskXRay } from "./task-xray";

const TABS = [
  { id: "xray", label: "Dashboard", n: "01" },
  { id: "radar", label: "Skills Radar", n: "02" },
  { id: "roles", label: "Future roles", n: "03" },
  { id: "pathway", label: "My pathway", n: "04" },
  { id: "compass", label: "Impact Compass", n: "05" },
  { id: "changes", label: "What changed", n: "06" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

export function MeDashboard() {
  const signals = useSignals();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [tab, setTab] = useState<TabId>("xray");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [sdgWeight, setSdgWeight] = useState(0);

  useEffect(() => {
    const saved = loadProfile();
    // A judge opening /me directly sees a sample person instead of an empty page.
    const params = new URLSearchParams(window.location.search);
    const persona = PERSONAS.find((item) => item.id === params.get("persona"));
    const next = persona ? profileFromPersona(persona) : (saved ?? profileFromPersona(PERSONAS[0]!));
    setProfile(next);
    setRoleId(loadPlan(next.id));
    setIsSample(persona !== undefined || saved === null);
    const wanted = params.get("tab");
    if (TABS.some((item) => item.id === wanted)) setTab(wanted as TabId);
  }, []);

  const matches = useMemo(
    () => (profile ? matchRoles(profile, signals.momentum, signals.scenario, sdgWeight) : []),
    [profile, signals.momentum, signals.scenario, sdgWeight],
  );
  // The chosen next role (saved per person). Nothing is chosen until the person picks.
  const chosen = matches.find((match) => match.role.id === roleId) ?? null;
  // Impact Compass still previews the best match before anything is chosen.
  const preview = chosen ?? matches[0] ?? null;

  if (profile === null) return <div className="min-h-dvh bg-paper" />;
  const occupation = OCCUPATIONS[profile.currentSoc]!;
  const choose = (id: string | null) => {
    setRoleId(id);
    savePlan(profile.id, id);
  };
  const go = (next: TabId) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar>
        <ScenarioSwitch value={signals.scenario} onChange={signals.setScenario} />
        <EvidenceChip signals={signals} />
      </TopBar>

      {isSample ? (
        <div className="border-b border-line bg-saffron-soft">
          <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-3 px-5 py-2 text-[13px] md:px-8">
            <span>
              You&apos;re looking at <b>{profile.name}</b>, a synthetic sample person.
            </span>
            <Link href="/start" className="underline underline-offset-4">
              Start with your own profile →
            </Link>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1240px] px-5 pt-7 pb-20 md:px-8">
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10">
          <aside className="space-y-4 lg:sticky lg:top-20">
            <PersonCard profile={profile} />
          </aside>

          <section className="min-w-0">
            <nav className="nx-no-print -mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Your journey">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "step" : undefined}
                  className={cn(
                    "nx-focus inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[14px] transition-colors",
                    tab === item.id ? "border-saffron bg-saffron-soft text-ink shadow-[inset_0_-2px_0_var(--saffron)]" : "border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span className={cn("font-mono text-[11px]", tab === item.id ? "text-saffron-deep" : "text-ink-3")}>{item.n}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6" key={`${tab}-${signals.scenario}-${signals.snapshot.id}`}>
              {tab === "xray" ? (
                <TaskXRay
                  profile={profile}
                  occupation={occupation}
                  target={chosen ? { label: chosen.role.label, weeks: chosen.weeksToReady } : null}
                  momentum={signals.momentum[signals.scenario]}
                  matches={matches}
                  scenario={signals.scenario}
                  onPickRole={() => go("roles")}
                  onRemoveRole={() => choose(null)}
                  onPathway={() => go("pathway")}
                  onNext={() => go("radar")}
                />
              ) : null}
              {tab === "radar" ? <SkillsRadar profile={profile} signals={signals} onNext={() => go("roles")} /> : null}
              {tab === "roles" ? (
                <FutureRoles
                  matches={matches}
                  skills={Object.keys(profile.skills)}
                  scenario={signals.scenario}
                  sdgWeight={sdgWeight}
                  chosenId={chosen?.role.id ?? null}
                  onRemove={() => choose(null)}
                  onPlan={(id) => {
                    choose(id);
                    go("pathway");
                  }}
                />
              ) : null}
              {tab === "pathway" ? (
                chosen ? (
                  <PathwayView profile={profile} match={chosen} matches={matches} onPick={choose} onNext={() => go("compass")} />
                ) : (
                  <NoRoleYet onPick={() => go("roles")} />
                )
              ) : null}
              {tab === "compass" ? (
                <ImpactCompass
                  profile={profile}
                  momentum={signals.momentum}
                  scenario={signals.scenario}
                  weight={sdgWeight}
                  onWeight={setSdgWeight}
                  onProfile={setProfile}
                  chosen={preview}
                  onPlan={(id) => {
                    choose(id);
                    go("pathway");
                  }}
                />
              ) : null}
              {tab === "changes" ? <WhatChanged profile={profile} signals={signals} /> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function NoRoleYet({ onPick }: { onPick: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-saffron-soft font-mono text-[18px] text-saffron-deep">?</span>
      <p className="mt-4 text-[20px] font-medium">No next role yet</p>
      <p className="mt-1 text-[14px] text-ink-3">Pick one and the pathway builds itself.</p>
      <button onClick={onPick} className="nx-micro nx-focus mt-5 inline-flex min-h-10 items-center rounded-md bg-saffron px-4 text-saffron-deep">
        Choose a next role →
      </button>
    </div>
  );
}
