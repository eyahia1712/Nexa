"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Micro } from "@/components/ui/bits";
import type { OrgData, OrgOverview } from "@/lib/engine/org";
import { cn } from "@/lib/utils";

import { DEPT_COLORS } from "./org-colors";

/**
 * The organisation dashboard: four headline boxes (same build as the landing
 * page's problem boxes), how the workforce grew year by year, and every
 * department at a glance. Everything is computed from the loaded data.
 */

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && setSeen(true),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, seen };
}

function useCount(target: number, run: boolean, ms = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, ms]);
  return value;
}

export function OrgOverviewView({
  data,
  overview,
  readiness,
  onPeople,
  onDepts,
  onMoved,
  onFresh,
}: {
  data: OrgData;
  overview: OrgOverview;
  readiness: {
    avgShift: number;
    high: number;
    movable: number;
    flagged: boolean;
  };
  onPeople: () => void;
  onDepts: () => void;
  onMoved: () => void;
  onFresh: () => void;
}) {
  const deptColor = useMemo(
    () =>
      new Map(
        data.departments.map((dept, index) => [
          dept,
          DEPT_COLORS[index % DEPT_COLORS.length]!,
        ]),
      ),
    [data.departments],
  );
  const first = overview.growth[0]!;

  return (
    <div className="space-y-6">
      <header>
        <Micro>01 · Dashboard</Micro>
        <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">
          How the team is growing and changing.
        </h2>
      </header>
      <HeadlineBoxes
        data={data}
        overview={overview}
        deptColor={deptColor}
        sinceYear={first.year}
        sinceTotal={first.total}
        onPeople={onPeople}
        onDepts={onDepts}
        onMoved={onMoved}
        onFresh={onFresh}
      />
      <GrowthBars overview={overview} />
      <ReadinessStrip readiness={readiness} />
    </div>
  );
}

/* ---------------------------------------------------------- headline boxes */

function Box({
  children,
  source,
  onClick,
  action,
}: {
  children: React.ReactNode;
  source: string;
  onClick?: () => void;
  action?: string;
}) {
  const className =
    "group flex flex-col rounded-2xl border border-line-strong/60 bg-card p-6 text-left text-ink shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] transition-all duration-300 hover:-translate-y-1";
  const footer = (
    <p className="mt-5 flex items-center justify-between gap-2 text-[11px] text-ink-3">
      <span>{source}</span>
      {action ? (
        <span className="shrink-0 font-medium text-[#2a78d6] transition-transform group-hover:translate-x-0.5">
          {action} →
        </span>
      ) : null}
    </p>
  );
  return onClick ? (
    <button
      onClick={onClick}
      className={`${className} nx-focus cursor-pointer hover:border-[#2a78d6]/50 hover:shadow-[0_18px_40px_-22px_#2a78d6]`}
    >
      <div className="w-full flex-1">{children}</div>
      {footer}
    </button>
  ) : (
    <article className={className}>
      <div className="flex-1">{children}</div>
      {footer}
    </article>
  );
}

function HeadlineBoxes({
  data,
  overview,
  deptColor,
  sinceYear,
  sinceTotal,
  onPeople,
  onDepts,
  onMoved,
  onFresh,
}: {
  data: OrgData;
  overview: OrgOverview;
  deptColor: Map<string, string>;
  sinceYear: number;
  sinceTotal: number;
  onPeople: () => void;
  onDepts: () => void;
  onMoved: () => void;
  onFresh: () => void;
}) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const headcount = useCount(overview.headcount, seen);
  const depts = useCount(overview.departments.length, seen);
  const moved = useCount(overview.relabelled.length, seen);
  const fresh = useCount(overview.fresh.length, seen);
  const source = data.demo
    ? "Demo data · not real Maybank staff"
    : "From your uploaded CSV";
  const people = [...data.employees].sort(
    (a, b) =>
      data.departments.indexOf(a.dept) - data.departments.indexOf(b.dept),
  );
  const movedShare =
    overview.headcount === 0
      ? 0
      : overview.relabelled.length / overview.headcount;
  const experienced = overview.headcount - overview.fresh.length;
  const max = Math.max(1, overview.fresh.length, experienced);
  const [hoverDept, setHoverDept] = useState<string | null>(null);

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Box source={source} onClick={onPeople} action="View all">
        <p className="nx-micro text-[11px] text-ink-3">Total headcount</p>
        <p className="mt-2 font-mono text-[40px] leading-none font-semibold">
          {headcount}
        </p>
        <p className="mt-2 text-[13px] text-ink-2">
          people ·{" "}
          <span className="font-mono text-human">
            +{overview.headcount - sinceTotal} since {sinceYear}
          </span>
        </p>
        <div className="mt-4 grid grid-cols-10 gap-1" aria-hidden>
          {people.map((employee, index) => (
            <span
              key={employee.id}
              title={`${employee.title} · ${employee.dept}`}
              className="aspect-square rounded-full transition-all duration-500"
              style={{
                background: seen
                  ? deptColor.get(employee.dept)
                  : "var(--stone)",
                transform: seen ? "scale(1)" : "scale(0.4)",
                transitionDelay: `${index * 22}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-3">
          each dot = one person, coloured by department
        </p>
      </Box>

      <Box source={source} onClick={onDepts} action="Open">
        <p className="nx-micro text-[11px] text-ink-3">Departments</p>
        <p className="mt-2 font-mono text-[40px] leading-none font-semibold">
          {depts}
        </p>
        <p className="mt-2 text-[13px] text-ink-2">
          with <b className="font-mono">{overview.roles}</b> job titles
        </p>
        <div className="mt-5 flex h-4 gap-0.5 overflow-hidden rounded-full">
          {overview.departments.map((dept) => (
            <span
              key={dept.name}
              onPointerEnter={() => setHoverDept(dept.name)}
              onPointerLeave={() => setHoverDept(null)}
              className="h-full transition-[flex-grow,opacity] duration-1000 ease-out"
              style={{
                flexGrow: seen ? dept.headcount : 0.001,
                background: deptColor.get(dept.name),
                opacity: hoverDept && hoverDept !== dept.name ? 0.35 : 1,
              }}
            />
          ))}
        </div>
        <p className="mt-2 h-4 truncate text-[12px] text-ink-2">
          {hoverDept ? (
            <>
              <b>{hoverDept}</b> ·{" "}
              {
                overview.departments.find((dept) => dept.name === hoverDept)
                  ?.headcount
              }{" "}
              people
            </>
          ) : (
            <span className="text-ink-3">hover a colour</span>
          )}
        </p>
      </Box>

      <Box source={source} onClick={onMoved} action="See who">
        <p className="nx-micro text-[11px] text-ink-3">Re-labelled</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[40px] leading-none font-semibold text-[#6250d6]">
              {moved}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-2">
              moved into a new role here
            </p>
          </div>
          <Ring value={seen ? movedShare : 0} color="#6250d6" />
        </div>
        <p className="mt-3 text-[12px] text-ink-3">
          <b className="font-mono text-ink">{Math.round(movedShare * 100)}%</b>{" "}
          of staff grew from inside
        </p>
      </Box>

      <Box source={source} onClick={onFresh} action="See who">
        <p className="nx-micro text-[11px] text-ink-3">Genuinely new</p>
        <p className="mt-2 font-mono text-[40px] leading-none font-semibold text-[#1baf7a]">
          {fresh}
        </p>
        <p className="mt-2 text-[13px] text-ink-2">joined fresh from study</p>
        <div className="mt-4 space-y-2.5">
          {[
            {
              label: "Fresh",
              value: overview.fresh.length,
              gradient: "linear-gradient(90deg,#56C02B,#1baf7a)",
            },
            {
              label: "Experienced",
              value: experienced,
              gradient: "linear-gradient(90deg,#26BDE2,#2a78d6)",
            },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="w-[74px] text-[11.5px] text-ink-2">
                {bar.label}
              </span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone">
                <span
                  className="block h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{
                    width: seen ? `${(bar.value / max) * 100}%` : "0%",
                    background: bar.gradient,
                  }}
                />
              </span>
              <span className="w-6 text-right font-mono text-[12px]">
                {bar.value}
              </span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 80 80"
      className="size-16 shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--stone)"
        strokeWidth="10"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{
          transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------ growth chart */

/** Year colours run teal → blue → violet: older years cooler, the latest strongest. */
const RAMP = ["#1baf7a", "#0a97d9", "#2a78d6", "#4c5fd8", "#6250d6"];
function rampColor(index: number, count: number) {
  if (count <= 1) return RAMP[RAMP.length - 1]!;
  return RAMP[Math.round((index / (count - 1)) * (RAMP.length - 1))]!;
}

type Metric = "headcount" | "joined" | "moves";

/** One slim bar per year, one colour, value on top — the Xveris dashboard chart. */
function GrowthBars({ overview }: { overview: OrgOverview }) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const [metric, setMetric] = useState<Metric>("headcount");
  const [hover, setHover] = useState<number | null>(null);
  const growth = overview.growth;
  const valueOf = (point: (typeof growth)[number]) =>
    metric === "headcount"
      ? point.total
      : metric === "joined"
        ? point.joined
        : point.moves;
  const bars = growth.map((point) => ({
    year: point.year,
    value: valueOf(point),
  }));
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const ticks = [max, Math.round(max / 2), 0];
  const first = bars[0]!.value;
  const last = bars[bars.length - 1]!.value;
  const total =
    metric === "headcount"
      ? last
      : bars.reduce((sum, bar) => sum + bar.value, 0);
  const caption =
    metric === "headcount"
      ? `${first} → ${last} people`
      : metric === "joined"
        ? `${total} joined`
        : `${total} role changes`;

  return (
    <article
      ref={ref}
      className="rounded-2xl border border-line-strong/60 bg-card p-5 shadow-[0_14px_34px_-24px_rgb(0_0_0/45%)] sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-3">
        <h3 className="text-[15px] font-medium">
          Growth, {bars[0]!.year}–{bars[bars.length - 1]!.year}
        </h3>
        <div className="flex items-center gap-4">
          {(
            [
              ["headcount", "Headcount"],
              ["joined", "New joiners"],
              ["moves", "Role changes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMetric(id)}
              className={cn(
                "nx-focus text-[12.5px] transition-colors",
                metric === id
                  ? "font-semibold text-ink underline decoration-saffron decoration-2 underline-offset-[6px]"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
          <span className="font-mono text-[12px] text-ink-3">{caption}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex h-[220px] flex-none flex-col justify-between text-right font-mono text-[11px] text-ink-3">
          {ticks.map((tick, index) => (
            <span key={index}>{tick}</span>
          ))}
        </div>
        <div className="relative h-[220px] min-w-0 flex-1">
          <span className="absolute inset-x-0 top-0 h-px bg-line" aria-hidden />
          <span
            className="absolute inset-x-0 top-1/2 h-px bg-line"
            aria-hidden
          />
          <span
            className="absolute inset-x-0 bottom-0 h-px bg-ink"
            aria-hidden
          />
          <div className="absolute inset-0 grid auto-cols-fr grid-flow-col items-end gap-3">
            {bars.map((bar, index) => {
              const previous = index > 0 ? bars[index - 1]!.value : null;
              return (
                <div
                  key={bar.year}
                  className="relative flex h-full items-end justify-center"
                  onPointerEnter={() => setHover(index)}
                  onPointerLeave={() => setHover(null)}
                >
                  <span
                    className="relative w-full max-w-[40px] rounded-t-[4px] transition-[height,opacity] duration-700 ease-out"
                    style={{
                      height: seen ? `${(bar.value / max) * 100}%` : "0%",
                      background: `linear-gradient(180deg, ${rampColor(index, bars.length)}, ${rampColor(index, bars.length)}b3)`,
                      opacity: hover === null || hover === index ? 1 : 0.45,
                      transitionDelay: `${index * 70}ms`,
                    }}
                  >
                    <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 font-mono text-[12px] font-semibold text-ink">
                      {bar.value}
                    </span>
                    {hover === index && previous !== null ? (
                      <span className="absolute bottom-[calc(100%+26px)] left-1/2 -translate-x-1/2 rounded-[4px] bg-ink px-2 py-1 font-mono text-[11px] whitespace-nowrap text-paper">
                        {bar.value - previous >= 0 ? "+" : "−"}
                        {Math.abs(bar.value - previous)} vs{" "}
                        {bars[index - 1]!.year}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 grid auto-cols-fr grid-flow-col gap-3 pl-[34px] text-center font-mono text-[11.5px] text-ink-3">
        {bars.map((bar, index) => (
          <span
            key={bar.year}
            className={cn(hover === index && "font-semibold text-ink")}
          >
            {bar.year}
          </span>
        ))}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------- AI readiness */

function ReadinessStrip({
  readiness,
}: {
  readiness: {
    avgShift: number;
    high: number;
    movable: number;
    flagged: boolean;
  };
}) {
  const items = [
    {
      icon: "%",
      tone: "#2F6BFF",
      label: "Task time with AI by 2030",
      value: `${Math.round(readiness.avgShift * 100)}%`,
    },
    {
      icon: "!",
      tone: "#ce2c2c",
      label: "In high-shift roles",
      value: `${readiness.high} people`,
    },
    {
      icon: "↗",
      tone: "#0e7a4b",
      label: "Ready to grow in 6 months",
      value: `${readiness.movable} people`,
    },
    {
      icon: "✓",
      tone: readiness.flagged ? "#ce2c2c" : "#0e7a4b",
      label: "Fairness check",
      value: readiness.flagged ? "Review" : "Pass",
    },
  ];
  return (
    <div>
      <p className="nx-micro text-[11px] text-ink-3">AI readiness</p>
      <div className="mt-2 grid overflow-hidden rounded-2xl border border-line-strong/60 bg-card shadow-[0_14px_34px_-26px_rgb(0_0_0/45%)] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5",
              index > 0 && "border-t border-line sm:border-t-0 sm:border-l",
            )}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
              style={{ background: item.tone }}
            >
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="nx-micro block truncate text-[10.5px] text-ink-3">
                {item.label}
              </span>
              <span
                className="block font-mono text-[16px] font-semibold"
                style={{ color: item.tone }}
              >
                {item.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
