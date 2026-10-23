"use client";

import { useEffect, useState } from "react";

import { SdgTile } from "@/components/ui/bits";
import { cn } from "@/lib/utils";

/**
 * How it works, shown rather than told: six steps that play on their own (or
 * on click), each with a small live preview of that screen.
 */

const STEPS = [
  { title: "Tell us about you", line: "CV, form or sample person" },
  { title: "Task X-Ray", line: "Which of your tasks AI does today" },
  { title: "Skills Radar", line: "What's rising, what's fading" },
  { title: "Your matches", line: "Roles that fit, with the maths" },
  { title: "Your pathway", line: "Week-by-week, free courses first" },
  { title: "Choose with impact", line: "Let the SDGs move the ranking" },
];

export interface ScenarioShift {
  id: string;
  label: string;
  value: number;
  low: number;
  high: number;
}

export function HowItWorks({ scenarios }: { scenarios: ScenarioShift[] }) {
  // Opens on the Skills Radar and stays there until a step is clicked.
  const [step, setStep] = useState(2);
  const [scenario, setScenario] = useState(1);
  const shift = scenarios[scenario]!;
  const tone = ["bg-human", "bg-assist", "bg-auto"][scenario]!;
  const text = ["text-human", "text-assist", "text-auto"][scenario]!;

  return (
    <div className="mt-10 space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <ol className="space-y-2">
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <button
                onClick={() => setStep(index)}
                aria-pressed={step === index}
                className={cn(
                  "nx-focus relative flex w-full items-center gap-4 overflow-hidden rounded-xl border bg-card px-4 py-3 text-left transition-all",
                  step === index ? "border-saffron shadow-[0_14px_30px_-20px_rgb(0_0_0/45%)] ring-1 ring-saffron" : "border-line-strong/50 hover:border-ink",
                )}
              >
                {step === index ? <span className="absolute inset-y-0 left-0 w-1.5 bg-saffron" /> : null}
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full font-mono text-[12px]",
                    step === index ? "bg-saffron text-saffron-deep" : "bg-stone text-ink-3",
                  )}
                >
                  0{index + 1}
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{item.title}</span>
                  <span className="block text-[12.5px] text-ink-3">{item.line}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="nx-dotgrid relative min-h-[360px] overflow-hidden rounded-2xl border border-line-strong/50 bg-card p-6 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
          <div key={step} className="nx-rise">
            {step === 0 ? <PreviewIntake /> : null}
            {step === 1 ? <PreviewXray /> : null}
            {step === 2 ? <PreviewRadar /> : null}
            {step === 3 ? <PreviewMatches /> : null}
            {step === 4 ? <PreviewPathway /> : null}
            {step === 5 ? <PreviewImpact /> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line-strong/50 bg-card p-6 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)]">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <p className="nx-micro text-ink-3">Three futures, never one guess</p>
            <p className="mt-1 text-[15px] text-ink-2">A call-centre agent&apos;s task time done with AI by 2030</p>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
            {scenarios.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setScenario(index)}
                className={cn(
                  "nx-focus inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                  index === scenario ? "bg-card text-ink shadow-[0_2px_8px_-3px_rgb(0_0_0/30%)]" : "text-ink-2 hover:text-ink",
                )}
              >
                <span className={cn("size-2 rounded-full", ["bg-human", "bg-assist", "bg-auto"][index])} />
                {item.label}
              </button>
            ))}
          </div>
          <p className={cn("font-mono text-[40px] leading-none transition-colors", text)}>
            {Math.round(shift.value * 100)}%
            <span className="ml-2 text-[13px] text-ink-3">
              {Math.round(shift.low * 100)}–{Math.round(shift.high * 100)}%
            </span>
          </p>
        </div>
        <div className="relative mt-5 h-3 overflow-hidden rounded-full bg-stone">
          <span className="absolute inset-y-0 rounded-full bg-ink/10" style={{ left: `${shift.low * 100}%`, width: `${(shift.high - shift.low) * 100}%` }} />
          <span className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out", tone)} style={{ width: `${shift.value * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
          <span>0%</span>
          <span>shaded band = range</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="nx-micro mb-4 text-ink-3">{children}</p>;
}

function PreviewIntake() {
  const skills = ["Customer care", "CRM systems", "Empathy", "Banking products", "Bahasa · English · 中文", "Problem-solving"];
  return (
    <div>
      <Label>Your skills, found in your CV</Label>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span key={skill} className="nx-rise inline-flex h-9 items-center gap-2 rounded-full border border-ink bg-card px-4 text-[14px]" style={{ ["--i" as string]: index * 2 }}>
            <span className="size-2 rounded-full bg-human" />
            {skill}
          </span>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-ink-3">You confirm every one. Nothing is stored.</p>
    </div>
  );
}

function PreviewXray() {
  const tasks: [string, "auto" | "assist" | "human"][] = [
    ["Answer routine questions", "assist"],
    ["Record customer interactions", "assist"],
    ["Check problems were resolved", "human"],
    ["Refer unresolved complaints", "auto"],
    ["Determine charges and billing", "human"],
  ];
  const tone = { auto: "bg-auto", assist: "bg-assist", human: "bg-human" };
  const label = { auto: "AI takes over", assist: "AI assists", human: "Human-led" };
  return (
    <div>
      <Label>Customer service representative · real tasks</Label>
      <ul className="space-y-2">
        {tasks.map(([task, mode], index) => (
          <li key={task} className="nx-rise flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5" style={{ ["--i" as string]: index * 2 }}>
            <span className={cn("size-2.5 shrink-0 rounded-full", tone[mode])} />
            <span className="flex-1 text-[14px]">{task}</span>
            <span className="text-[12px] text-ink-3">{label[mode]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The same SDG colours as the 600k card in the problem section. */
const RADAR_COLORS = ["#2F6BFF", "#E5243B", "#4C9F38", "#FCC30B", "#DD1367", "#26BDE2", "#FD6925", "#A21942", "#3F7E44", "#00689D", "#DDA63A", "#19486A"];

function PreviewRadar() {
  const dots = [
    [0.88, 18, "AI agents"],
    [0.82, 62, "Data analysis"],
    [0.76, 104, ""],
    [0.7, 140, "Cybersecurity"],
    [0.64, 176, ""],
    [0.58, 205, "Project mgmt"],
    [0.52, 236, ""],
    [0.46, 262, ""],
    [0.4, 290, "Customer care"],
    [0.32, 318, ""],
    [0.26, 342, "Data entry"],
    [0.6, 330, ""],
  ] as const;
  return (
    <div className="flex flex-col items-center">
      <Label>Skill momentum · further out = rising</Label>
      <svg viewBox="0 0 280 260" className="w-[300px]" aria-hidden>
        <g transform="translate(20 10)">
          {[100, 72, 44].map((r) => (
            <circle key={r} cx="120" cy="120" r={r} fill={r === 100 ? "var(--paper-2)" : "none"} stroke="var(--line-strong)" strokeDasharray={r === 100 ? undefined : "3 4"} />
          ))}
          <circle cx="120" cy="120" r="44" fill="color-mix(in srgb, var(--auto) 7%, transparent)" />
          <g className="nx-sweep" style={{ transformOrigin: "120px 120px" }}>
            <line x1="120" y1="120" x2="120" y2="20" stroke="var(--saffron)" strokeWidth="2" />
          </g>
          {dots.map(([r, angle, label], index) => {
            const a = (angle * Math.PI) / 180;
            const x = 120 + Math.cos(a) * r * 100;
            const y = 120 + Math.sin(a) * r * 100;
            const color = RADAR_COLORS[index % RADAR_COLORS.length];
            return (
              <g key={index} className="nx-rise" style={{ ["--i" as string]: index }}>
                <circle cx={x} cy={y} r={label ? 8 : 5.5} fill={color} stroke="#FFFFFF" strokeWidth="2" />
                {label ? (
                  <text x={x} y={y - 12} textAnchor="middle" fontSize="9.5" fill="var(--ink-2)" paintOrder="stroke" stroke="var(--card)" strokeWidth="3">
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function PreviewMatches() {
  const roles: [string, number, number, number][] = [
    ["Project Manager", 18, 8, 20],
    ["UI / UX Designer", 18, 5, 20],
    ["Training Specialist", 20, 7, 13],
  ];
  return (
    <div>
      <Label>Score = skills + transferable + demand</Label>
      <ul className="space-y-3">
        {roles.map(([role, skills, transfer, demand], index) => (
          <li key={role} className="nx-rise rounded-lg border border-line bg-card p-3" style={{ ["--i" as string]: index * 2 }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-medium">
                <span className="mr-2 font-mono text-[12px] text-ink-3">#{index + 1}</span>
                {role}
              </span>
              <span className="font-mono text-[22px]">{skills + transfer + demand}</span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-stone">
              <span className="nx-grow bg-ink" style={{ width: `${skills}%` }} />
              <span className="nx-grow bg-ink-3" style={{ width: `${transfer}%` }} />
              <span className="nx-grow bg-saffron" style={{ width: `${demand}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewPathway() {
  const steps: [string, string, string][] = [
    ["Wk 1–3", "Spreadsheets", "Free to audit"],
    ["Wk 4–5", "Generative AI tools", "Free"],
    ["Wk 6–7", "Agile project management", "Free to audit"],
    ["Wk 8–9", "Leadership", "Free to audit"],
  ];
  return (
    <div>
      <Label>Route to Project Manager · 6 h a week</Label>
      <ol className="relative space-y-3 border-l-2 border-dashed border-line-strong pl-5">
        {steps.map(([week, skill, cost], index) => (
          <li key={skill} className="nx-rise relative" style={{ ["--i" as string]: index * 2 }}>
            <span
              className="absolute top-2.5 -left-[29px] size-5 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_var(--line-strong)]"
              style={{ background: ["#2F6BFF", "#FCC30B", "#4C9F38", "#DD1367"][index] }}
            />
            <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2.5">
              <span className="text-[14px] font-medium">{skill}</span>
              <span className="text-[12px] text-ink-3">
                {week} · {cost}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PreviewImpact() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setOn(true), 900);
    return () => clearTimeout(timer);
  }, []);
  const rows = on
    ? [
        ["Sustainability Specialist", [12, 13]],
        ["Data Analyst", [16, 8]],
        ["Project Manager", [8, 9]],
      ]
    : [
        ["Data Analyst", [16, 8]],
        ["Project Manager", [8, 9]],
        ["Sustainability Specialist", [12, 13]],
      ];
  return (
    <div>
      <Label>{on ? "Climate (SDG 13) switched on — the ranking moves" : "Ranked by fit and demand"}</Label>
      <div className="mb-4 flex items-center gap-2">
        <SdgTile n={13} size={32} className={cn("transition-all", on ? "ring-2 ring-ink ring-offset-2" : "opacity-40")} />
        <SdgTile n={7} size={32} className="opacity-40" />
        <SdgTile n={8} size={32} className="opacity-40" />
      </div>
      <ul className="space-y-2">
        {rows.map(([role, goals], index) => (
          <li key={role as string} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 transition-all duration-500">
            <span className="font-mono text-[12px] text-ink-3">#{index + 1}</span>
            <span className="flex-1 text-[14px] font-medium">{role as string}</span>
            {(goals as number[]).map((n) => (
              <SdgTile key={n} n={n} size={20} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
