import type { ReactNode } from "react";

import { SKILL_BY_ID, goal, goalOf, SDG_TARGETS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const BTN_SAFFRON =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-saffron px-4 text-saffron-deep transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0";
export const BTN_INK =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-paper transition-colors hover:bg-[#2a2a28] disabled:opacity-50";
export const BTN_GHOST =
  "nx-micro nx-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-ink transition-colors hover:border-line-strong hover:bg-paper-2 disabled:opacity-50";

export function Micro({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("nx-micro text-ink-3", className)}>{children}</p>;
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-line bg-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Chip({ children, className, tone = "plain" }: { children: ReactNode; className?: string; tone?: "plain" | "saffron" | "human" | "assist" | "auto" | "ink" }) {
  const skin = {
    plain: "border-line bg-card text-ink-2",
    saffron: "border-[#e6b000] bg-saffron-soft text-saffron-deep",
    human: "border-human/30 bg-[color-mix(in_srgb,var(--human)_8%,white)] text-human",
    assist: "border-assist/30 bg-[color-mix(in_srgb,var(--assist)_9%,white)] text-assist",
    auto: "border-auto/30 bg-[color-mix(in_srgb,var(--auto)_8%,white)] text-auto",
    ink: "border-ink bg-ink text-paper",
  }[tone];
  return <span className={cn("nx-micro inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 whitespace-nowrap", skin, className)}>{children}</span>;
}

/** A small square in the official colour of an SDG goal, with its number. */
export function SdgTile({ n, size = 26, className }: { n: number; size?: number; className?: string }) {
  const meta = goal(n);
  return (
    <span
      title={`SDG ${n} — ${meta.name}`}
      className={cn("inline-grid shrink-0 place-items-center rounded-[5px] font-mono font-semibold text-white", className)}
      style={{ width: size, height: size, background: meta.color, fontSize: size * 0.46 }}
    >
      {n}
    </span>
  );
}

export function SdgTarget({ target, why }: { target: string; why?: string }) {
  const n = goalOf(target);
  return (
    <div className="flex items-start gap-2.5">
      <SdgTile n={n} size={24} />
      <div className="min-w-0">
        <p className="text-[13px] leading-snug">
          <span className="font-mono font-semibold">{target}</span> <span className="text-ink-2">{SDG_TARGETS[target]}</span>
        </p>
        {why ? <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{why}</p> : null}
      </div>
    </div>
  );
}

export function SkillPill({ id, level, className, strong }: { id: string; level?: number; className?: string; strong?: boolean }) {
  const skill = SKILL_BY_ID.get(id);
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap",
        strong ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink",
        className,
      )}
    >
      {skill?.label ?? id}
      {level !== undefined ? <span className={cn("font-mono text-[11px]", strong ? "text-paper/60" : "text-ink-3")}>{"●".repeat(level)}</span> : null}
    </span>
  );
}

/** A "source · date" line under every number. */
export function SourceLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-3", className)}>
      <svg viewBox="0 0 16 16" className="mt-[1px] size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M3 2.5h6l4 4v7a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-10.5a.5.5 0 0 1 .5-.5z" />
        <path d="M9 2.5v4h4" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

export function EstimateNote({ className }: { className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 text-[11.5px] text-ink-3", className)}>
      <span className="grid size-3.5 place-items-center rounded-full border border-ink-3 font-mono text-[9px]">~</span>
      Estimate, not a prediction about you. Explore the scenarios.
    </p>
  );
}

/** A bar split into human-led / AI-assisted / AI-automated task time. */
export function TaskTimeBar({ human, assist, auto, className, animate = true }: { human: number; assist: number; auto: number; className?: string; animate?: boolean }) {
  const total = human + assist + auto || 1;
  return (
    <div className={cn("flex h-2.5 w-full overflow-hidden rounded-full bg-stone", className)} role="img" aria-label={`Human-led ${Math.round((human / total) * 100)}%, AI-assisted ${Math.round((assist / total) * 100)}%, AI takes over ${Math.round((auto / total) * 100)}%`}>
      <span className={cn("h-full bg-human", animate && "nx-grow")} style={{ width: `${(human / total) * 100}%` }} />
      <span className={cn("h-full bg-assist", animate && "nx-grow")} style={{ width: `${(assist / total) * 100}%` }} />
      <span className={cn("h-full bg-auto", animate && "nx-grow")} style={{ width: `${(auto / total) * 100}%` }} />
    </div>
  );
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className={cn("size-2.5 rounded-full", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export const TASK_LEGEND = [
  { label: "Human-led", className: "bg-human" },
  { label: "AI assists", className: "bg-assist" },
  { label: "AI takes over", className: "bg-auto" },
];
