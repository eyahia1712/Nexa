"use client";

import { useMemo, useState } from "react";

import type { SignalsState } from "@/components/app/use-signals";
import { BTN_SAFFRON, Card, Chip, Micro, SdgTile, SourceLine } from "@/components/ui/bits";
import { SKILLS, goalOf, type SkillCategory } from "@/lib/catalog";
import { BAND_LABEL, type MomentumBand, type SkillMomentum } from "@/lib/engine/momentum";
import type { Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

const CATEGORIES: SkillCategory[] = ["AI & data", "Technology", "Green & health", "Human", "Business"];
const BAND_TONE: Record<MomentumBand, "human" | "saffron" | "plain" | "auto"> = { "rising-fast": "human", rising: "saffron", steady: "plain", declining: "auto" };
/** One colour per momentum band (text, bars). Saffron is kept for the person's own skills. */
const BAND_COLOR: Record<MomentumBand, string> = { "rising-fast": "#1E8A4C", rising: "#2B7BB9", steady: "#8A7A5C", declining: "#D23C3C" };
const SIZE = 560;
const C = SIZE / 2;
const INNER = 28;
const OUTER = 232;

/** Scores mostly live between 15 and 85; spread that band across the radar. */
const radiusFor = (score: number) => INNER + Math.max(0, Math.min(1, (score - 12) / 76)) * (OUTER - INNER);

type Focus = "mine" | "all";

export function SkillsRadar({ profile, signals, onNext }: { profile: Profile; signals: SignalsState; onNext: () => void }) {
  const momentum = signals.momentum[signals.scenario];
  const [selected, setSelected] = useState<string>(() => Object.keys(profile.skills)[0] ?? "ai_agents");
  // One switch for the radar and the list: your skills first, everything on demand.
  const [focus, setFocus] = useState<Focus>("mine");

  const points = useMemo(() => {
    return CATEGORIES.flatMap((category, sector) => {
      const skills = SKILLS.filter((skill) => skill.category === category);
      const start = (sector / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2;
      const span = (Math.PI * 2) / CATEGORIES.length;
      return skills.map((skill, index) => {
        const angle = start + span * ((index + 0.5) / skills.length);
        const m = momentum.get(skill.id)!;
        const r = radiusFor(m.score);
        return { skill, m, x: C + Math.cos(angle) * r, y: C + Math.sin(angle) * r, mine: profile.skills[skill.id] !== undefined };
      });
    });
  }, [momentum, profile.skills]);

  const detail = momentum.get(selected);
  const list = [...momentum.values()].filter((item) => profile.skills[item.skill.id] !== undefined).sort((a, b) => b.score - a.score);


  return (
    <div className="space-y-5">
      <header>
        <Micro>02 · Future Skills Radar</Micro>
        <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">Which skills are rising, holding or fading — and why.</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-3">Further out = rising faster · tap any dot</p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-ink-2">
              Showing: <b className="text-ink">{focus === "mine" ? "My skills" : "All skills"}</b>
            </p>
            <FocusSwitch focus={focus} onFocus={setFocus} />
          </div>
          <svg viewBox={`-34 -26 ${SIZE + 68} ${SIZE + 52}`} className="mx-auto block w-full max-w-[600px]" role="img" aria-label="Future skills radar">
            {[
              { score: 88, label: "Rising fast", color: "#1E8A4C" },
              { score: 68, label: "Rising", color: "#2B7BB9" },
              { score: 56, label: "Steady", color: "#C27C00" },
              { score: 44, label: "Declining", color: "#D23C3C" },
            ].map((ring) => (
              <g key={ring.score}>
                <circle cx={C} cy={C} r={radiusFor(ring.score)} fill={ring.score === 88 ? "var(--paper-2)" : "none"} stroke="var(--line-strong)" strokeOpacity={0.6} strokeDasharray={ring.score === 88 ? undefined : "3 4"} />
                <text
                  x={C + 5}
                  y={C - radiusFor(ring.score) + 13}
                  fontSize="11.5"
                  fill={ring.color}
                  fontWeight={700}
                  fontFamily="var(--font-narrow)"
                  letterSpacing="0.8"
                  paintOrder="stroke"
                  stroke="white"
                  strokeWidth="3"
                >
                  {ring.label.toUpperCase()}
                </text>
              </g>
            ))}
            <circle cx={C} cy={C} r={radiusFor(44)} fill="color-mix(in srgb, var(--auto) 6%, transparent)" />
            {CATEGORIES.map((category, sector) => {
              const angle = (sector / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2;
              const mid = angle + Math.PI / CATEGORIES.length;
              return (
                <g key={category}>
                  <line x1={C} y1={C} x2={C + Math.cos(angle) * OUTER} y2={C + Math.sin(angle) * OUTER} stroke="var(--line)" />
                  <text
                    x={C + Math.cos(mid) * (OUTER + 18)}
                    y={C + Math.sin(mid) * (OUTER + 18) + 4}
                    textAnchor={Math.abs(Math.cos(mid)) < 0.3 ? "middle" : Math.cos(mid) > 0 ? "start" : "end"}
                    fontSize="12"
                    fill="var(--ink-2)"
                    fontFamily="var(--font-narrow)"
                    letterSpacing="1"
                  >
                    {category.toUpperCase()}
                  </text>
                </g>
              );
            })}
            {/* Sweep line, for the radar feel */}
            <g className="nx-sweep" style={{ transformOrigin: `${C}px ${C}px` }} opacity="0.5">
              <line x1={C} y1={C} x2={C} y2={C - OUTER} stroke="var(--saffron)" strokeWidth="2" />
            </g>
            {points
              .sort((a, b) => (focus === "mine" ? Number(a.mine) - Number(b.mine) : Number(b.mine) - Number(a.mine)))
              .map((point) => {
                const active = point.skill.id === selected;
                const big = focus === "mine" ? point.mine : !point.mine;
                return (
                  <g key={point.skill.id} onClick={() => setSelected(point.skill.id)} className="cursor-pointer" role="button" aria-label={`${point.skill.label}: ${point.m.score}`}>
                    <title>{`${point.skill.label}: ${point.m.score}`}</title>
                    <circle cx={point.x} cy={point.y} r={14} fill="transparent" />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 9 : big ? 7 : 4.5}
                      fill={point.mine ? "var(--saffron)" : "var(--card)"}
                      stroke={active ? "var(--ink)" : point.mine ? "var(--saffron-deep)" : "var(--ink-3)"}
                      strokeWidth={active ? 2.5 : 1.4}
                    />
                    {active ? (
                      <text x={point.x} y={point.y - 14} textAnchor="middle" fontSize={13} fill="var(--ink)" fontWeight={600} paintOrder="stroke" stroke="var(--card)" strokeWidth="5">
                        {point.skill.label.length > 26 ? `${point.skill.label.slice(0, 24)}…` : point.skill.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
          </svg>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full border border-saffron-deep bg-saffron" /> Yours
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-full border border-ink-3 bg-card" /> Other skills
            </span>
          </div>
        </Card>

        {detail ? <WhyPanel momentum={detail} mine={profile.skills[detail.skill.id]} /> : null}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-medium">My skills, by momentum</p>
        </div>
        <ul className="mt-4 grid gap-x-6 gap-y-1 md:grid-cols-2">
          {list.map((item) => {
            const color = BAND_COLOR[item.band];
            return (
              <li key={item.skill.id}>
                <button
                  onClick={() => setSelected(item.skill.id)}
                  className={cn("nx-focus grid w-full grid-cols-[1fr_120px_36px] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-paper-2", selected === item.skill.id && "bg-paper-2")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: profile.skills[item.skill.id] !== undefined ? "var(--saffron)" : color, boxShadow: `0 0 0 2px ${color}33` }} />
                    <span className="truncate text-[13.5px]">{item.skill.label}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-stone">
                    <span className="nx-grow block h-full rounded-full" style={{ width: `${item.score}%`, background: color }} />
                  </span>
                  <span className="text-right font-mono text-[12.5px]" style={{ color }}>
                    {item.score}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex justify-end">
        <button className={BTN_SAFFRON} onClick={onNext}>
          Next: roles that fit you →
        </button>
      </div>
    </div>
  );
}

function FocusSwitch({ focus, onFocus, className }: { focus: Focus; onFocus: (focus: Focus) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-full border border-line-strong/60 bg-paper p-1 text-[13px]", className)} role="radiogroup" aria-label="Show">
      {(["mine", "all"] as const).map((value) => {
        const on = focus === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={on}
            onClick={() => onFocus(value)}
            className={cn(
              "nx-focus inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 font-medium transition-all",
              on ? "bg-saffron text-saffron-deep shadow-[0_2px_8px_-2px_rgb(0_0_0/30%)]" : "text-ink-3 hover:text-ink",
            )}
          >
            {on ? <span aria-hidden>✓</span> : <span className={cn("size-2.5 rounded-full", value === "mine" ? "bg-saffron" : "bg-[#5B6B7A]")} />}
            {value === "mine" ? "My skills" : "All skills"}
          </button>
        );
      })}
    </div>
  );
}

function WhyPanel({ momentum, mine }: { momentum: SkillMomentum; mine: number | undefined }) {
  return (
    <Card className="nx-rise self-start p-5">
      <Micro>Why this score?</Micro>
      <p className="mt-2 text-[19px] leading-snug font-medium">{momentum.skill.label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip tone={BAND_TONE[momentum.band]}>{BAND_LABEL[momentum.band]}</Chip>
        {mine !== undefined ? <Chip tone="saffron">You · {["basic", "working", "strong"][mine - 1]}</Chip> : null}
      </div>
      <p className="mt-4 font-mono text-[44px] leading-none">{momentum.score}</p>
      <p className="text-[12px] text-ink-3">momentum, 0–100 · starts at 50</p>
      <ul className="mt-4 space-y-3">
        {momentum.parts.map((part) => (
          <li key={part.key} className="rounded-lg border border-line p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-medium">{part.label}</p>
              <p className={cn("font-mono text-[14px]", part.points > 0 ? "text-human" : part.points < 0 ? "text-auto" : "text-ink-3")}>
                {part.points > 0 ? "+" : ""}
                {part.points}
              </p>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{part.detail}</p>
            <SourceLine className="mt-1.5">{part.source}</SourceLine>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-1.5">
        <span className="text-[12px] text-ink-3">Advances</span>
        {[...new Set(momentum.skill.sdg.map(goalOf))].map((n) => (
          <SdgTile key={n} n={n} size={22} />
        ))}
        <span className="font-mono text-[11.5px] text-ink-3">{momentum.skill.sdg.join(" · ")}</span>
      </div>
    </Card>
  );
}
