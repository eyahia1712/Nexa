"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { SignalsState } from "@/components/app/use-signals";
import { Card, Micro, SourceLine } from "@/components/ui/bits";
import {
  HISTORY_SOURCE,
  momentumLines,
  researchLines,
  roleLines,
  yearlyPoints,
  type Line,
} from "@/lib/engine/history";
import type { Profile } from "@/lib/profile";
import { SKILLS } from "@/lib/catalog";
import { arxivCountVia } from "@/lib/signals/client";
import type { SignalSnapshot } from "@/lib/signals/snapshot";
import { cn, monthYear } from "@/lib/utils";

/**
 * "What changed": the whole history (every year since 2019) is always on
 * screen, and on the right a live zone keeps running in real time. The server
 * keeps asking arXiv for the last 30 days of papers, and every answer lands
 * on the live line at the moment it arrived. Hover anywhere to read that
 * exact year or second.
 */

/** Categorical colours, assigned in this fixed order (validated for colour-blind separation). */
const PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
];
const UP = "#0e7a4b";
const DOWN = "#ce2c2c";
const LIVE = "#e34948";
/** How much real time the live zone shows. */
const WINDOW_MS = 120_000;

type View = "skills" | "roles" | "research";
type Scope = "mine" | "movers";

const VIEWS: {
  id: View;
  label: string;
  color: string;
  unit: string;
  source: string;
}[] = [
  {
    id: "research",
    label: "Skill trends",
    color: "#1baf7a",
    unit: "papers / 10k",
    source: `${HISTORY_SOURCE} · live zone: last 30 days, re-read every few seconds · per 10,000 papers · ×10 scale`,
  },
  {
    id: "skills",
    label: "Skill momentum",
    color: "#2a78d6",
    unit: "momentum",
    source:
      "Momentum 0–100 · WEF 2025 + arXiv + Anthropic Economic Index, scored each year",
  },
  {
    id: "roles",
    label: "Role fit",
    color: "#6250d6",
    unit: "fit score",
    source:
      "Fit score 0–100 for this person · skills + demand, scored each year",
  },
];

const first = (values: (number | null)[]) =>
  values.find((value) => value !== null) ?? null;
const last = (values: (number | null)[]) =>
  [...values].reverse().find((value) => value !== null) ?? null;
const deltaOf = (line: Line) => {
  const a = first(line.values);
  const b = last(line.values);
  return a === null || b === null ? 0 : b - a;
};
const sign = (value: number, digits = 0) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(digits)}`;
/** Whole numbers from 100 up, one decimal below. */
const fmt = (value: number, digits: number) =>
  digits > 0 && Math.abs(value) >= 100
    ? Math.round(value).toLocaleString()
    : value.toFixed(digits);
const signed = (value: number, digits: number) =>
  digits > 0 && Math.abs(value) >= 100 ? sign(value, 0) : sign(value, digits);
const clockOf = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export interface Tick {
  t: number;
  values: Record<string, number>;
}

/** One live reading: papers per 10,000 on arXiv in the last 30 days, per skill measured so far. */
interface LiveSample {
  t: number;
  perTenK: Record<string, number>;
}

const LIVE_ROTATION = [
  "total",
  ...SKILLS.filter((skill) => skill.arxiv !== null).map((skill) => skill.id),
];
const LIVE_GAP_MS = 3_500;

/**
 * The always-running live feed: while the page is open, the browser asks
 * arXiv (through /api/arxiv) for the last 30 days of papers, one skill every
 * few seconds, and records every answer at the moment it arrives.
 */
function useLiveFeed() {
  const [samples, setSamples] = useState<LiveSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const counts = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const window30 = () => {
      const now = new Date();
      return {
        from: new Date(now.getTime() - 30 * 86_400_000)
          .toISOString()
          .slice(0, 10),
        to: now.toISOString().slice(0, 10),
      };
    };
    const step = async () => {
      const id = LIVE_ROTATION[cursor % LIVE_ROTATION.length]!;
      cursor += 1;
      const value = await arxivCountVia(id, window30());
      if (!alive) return;
      if (value === null) {
        setError("busy");
      } else {
        setError(null);
        counts.current[id] = value;
        const total = counts.current.total;
        if (total && total > 0) {
          const perTenK = Object.fromEntries(
            Object.entries(counts.current)
              .filter(([key]) => key !== "total")
              .map(([key, count]) => [key, (count / total) * 10_000]),
          );
          const sample = { t: Date.now(), perTenK };
          setSamples((current) =>
            [...current, sample].filter(
              (item) => item.t >= Date.now() - WINDOW_MS * 2,
            ),
          );
        }
      }
      timer = setTimeout(
        () => void step(),
        value === null ? LIVE_GAP_MS * 2 : LIVE_GAP_MS,
      );
    };
    void step();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { samples, error };
}

export function WhatChanged({
  profile,
  signals,
}: {
  profile: Profile;
  signals: SignalsState;
}) {
  const [view, setView] = useState<View>("research");
  const [scope, setScope] = useState<Scope>("movers");
  const mine = useMemo(
    () => new Set(Object.keys(profile.skills)),
    [profile.skills],
  );
  const running = signals.job?.state === "running";
  const points = useMemo(() => yearlyPoints(signals.live), [signals.live]);
  const feed = useLiveFeed();

  const skillData = useMemo(
    () => momentumLines(points, signals.scenario, mine),
    [points, signals.scenario, mine],
  );
  const research = useMemo(
    () => researchLines(signals.live, mine),
    [signals.live, mine],
  );
  const roles = useMemo(
    () => roleLines(profile, points, signals.scenario),
    [profile, points, signals.scenario],
  );
  const myMoving = skillData.some(
    (line) => line.mine && Math.abs(deltaOf(line)) >= 1,
  );

  const { labels, lines } = useMemo(() => {
    const pick = (pool: Line[]) => {
      const mineOnly = pool.filter((line) => line.mine);
      const list =
        scope === "mine" && mineOnly.length > 0
          ? mineOnly
          : [...pool].sort(
              (a, b) => Math.abs(deltaOf(b)) - Math.abs(deltaOf(a)),
            );
      return list
        .slice(0, 8)
        .sort((a, b) => (last(b.values) ?? 0) - (last(a.values) ?? 0));
    };
    if (view === "roles")
      return { labels: points.map((point) => point.label), lines: roles };
    if (view === "research")
      return { labels: research.labels, lines: pick(research.lines) };
    return {
      labels: points.map((point) => point.label),
      lines: pick(skillData),
    };
  }, [view, scope, points, roles, research, skillData]);

  // Live readings for the lines on screen. Research lines take the measured
  // 30-day share; scores hold their latest value as time runs on.
  const ticks = useMemo<Tick[]>(
    () =>
      feed.samples.map((sample) => ({
        t: sample.t,
        values: Object.fromEntries(
          lines.map((line) => [
            line.id,
            view === "research"
              ? (sample.perTenK[line.id] ?? last(line.values) ?? 0)
              : (last(line.values) ?? 0),
          ]),
        ),
      })),
    [feed.samples, lines, view],
  );
  const lastSample = feed.samples[feed.samples.length - 1];

  const meta = VIEWS.find((item) => item.id === view)!;
  const mineInView =
    view === "research" ? research.lines.some((line) => line.mine) : true;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Micro>06 · What changed</Micro>
          <h2 className="mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight font-medium tracking-[-0.02em]">
            How your future is moving.
          </h2>
        </div>
        <button
          className="nx-focus inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-card px-4 text-[13px] font-medium hover:border-ink disabled:opacity-60"
          disabled={running}
          onClick={() => void signals.refresh()}
        >
          <span className="relative flex size-2.5">
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                running ? "bg-saffron" : "bg-[#1baf7a]",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2.5 rounded-full",
                running ? "bg-saffron" : "bg-[#1baf7a]",
              )}
            />
          </span>
          {running
            ? `Reading live… ${signals.job?.done ?? 0}/${signals.job?.total || "…"}`
            : "Take a full live reading"}
        </button>
      </header>
      {signals.job?.state === "failed" ? (
        <p className="text-[13px] text-auto">
          Live reading failed. Saved readings still in use.
        </p>
      ) : null}

      <Ticker lines={skillData} />

      <Card className="relative overflow-hidden p-0">
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {VIEWS.map((item) => {
                const active = item.id === view;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      "nx-focus rounded-full border px-4 py-2 text-[13.5px] font-medium transition-all",
                      active
                        ? "text-white shadow-[0_6px_18px_-8px_var(--c)]"
                        : "bg-card text-ink-2 hover:text-ink",
                    )}
                    style={{
                      ["--c" as string]: item.color,
                      background: active ? item.color : undefined,
                      borderColor: active ? item.color : "var(--line)",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {view !== "roles" ? (
              <div className="inline-flex rounded-full border border-line bg-paper-2 p-1">
                {(
                  [
                    { id: "mine", label: "My skills", disabled: !mineInView },
                    { id: "movers", label: "Biggest movers", disabled: false },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    disabled={option.disabled}
                    onClick={() => setScope(option.id)}
                    className={cn(
                      "nx-focus rounded-full px-3.5 py-1.5 text-[13px] transition-colors disabled:opacity-40",
                      scope === option.id ||
                        (option.id === "movers" && !mineInView)
                        ? "bg-card font-medium text-ink shadow-sm"
                        : "text-ink-3 hover:text-ink",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <LiveChart
            key={`${view}-${scope}`}
            labels={labels}
            lines={lines}
            ticks={ticks}
            view={view}
            unit={meta.unit}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span
                  className={cn(
                    "absolute inline-flex size-full rounded-full opacity-70",
                    feed.error ? "bg-assist" : "animate-ping bg-[#e34948]",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    feed.error ? "bg-assist" : "bg-[#e34948]",
                  )}
                />
              </span>
              {feed.error ? (
                "Live feed paused — arXiv is busy, retrying"
              ) : lastSample ? (
                <LastUpdate t={lastSample.t} />
              ) : (
                "Connecting to arXiv…"
              )}
            </span>
            {view === "skills" && scope === "mine" && !myMoving ? (
              <span>Your skills hold steady — try “Biggest movers”.</span>
            ) : null}
          </div>
          <SourceLine className="mt-2">{meta.source}</SourceLine>
        </div>
      </Card>

      <Labour readings={signals.snapshots} />
    </div>
  );
}

function LastUpdate({ t }: { t: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span>
      Live from arXiv · new reading {Math.max(0, Math.round((now - t) / 1000))}s
      ago
    </span>
  );
}

/* ------------------------------------------------------------------ ticker */

function Ticker({ lines }: { lines: Line[] }) {
  const moved = lines
    .filter((line) => Math.abs(deltaOf(line)) >= 1)
    .sort((a, b) => Math.abs(deltaOf(b)) - Math.abs(deltaOf(a)));
  const items = [
    ...moved.filter((line) => line.mine),
    ...moved.filter((line) => !line.mine),
  ];
  if (items.length === 0) return null;
  const row = (key: string) => (
    <div
      key={key}
      className="flex shrink-0 items-center"
      aria-hidden={key === "b"}
    >
      {items.map((item) => {
        const delta = deltaOf(item);
        const up = delta > 0;
        return (
          <span
            key={item.id}
            className="flex items-center gap-2 border-r border-line px-5 whitespace-nowrap"
          >
            {item.mine ? (
              <span
                className="size-1.5 rounded-full bg-saffron"
                title="Your skill"
              />
            ) : null}
            <span className="text-[13px] font-medium">{item.label}</span>
            <span className="font-mono text-[12.5px] text-ink-2">
              {Math.round(last(item.values) ?? 0)}
            </span>
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[11.5px] font-medium"
              style={{
                color: up ? UP : DOWN,
                background: up ? "#0e7a4b14" : "#ce2c2c14",
              }}
            >
              {up ? "▲" : "▼"} {sign(delta)}
            </span>
          </span>
        );
      })}
    </div>
  );
  return (
    <div className="nx-ticker-wrap overflow-hidden rounded-xl border border-line bg-card py-2.5">
      <div className="nx-ticker flex w-max">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- live chart */

const W = 900;
const H = 400;
const PAD = { top: 30, right: 220, bottom: 36, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
/** Share of the plot given to history; the rest is the live zone. */
const HISTORY_SHARE = 0.66;
const LIVE_LEFT = PAD.left + INNER_W * HISTORY_SHARE;
const LIVE_RIGHT = PAD.left + INNER_W;
const LIVE_W = LIVE_RIGHT - LIVE_LEFT;

interface Reading {
  label: string;
  values: Map<string, number | null>;
  /** Values to compare against, for the small change numbers. */
  before: Map<string, number | null> | null;
  x: number;
}

function LiveChart({
  labels,
  lines,
  ticks,
  view,
  unit,
}: {
  labels: string[];
  lines: Line[];
  ticks: Tick[];
  view: View;
  unit: string;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const end = labels.length - 1;
  const [now, setNow] = useState(0);
  const [hoverPx, setHoverPx] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const digits = view === "research" ? 1 : 0;

  // The clock that makes the live zone run.
  useEffect(() => {
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lastFrame = 0;
    const frame = (time: number) => {
      if (time - lastFrame > 40) {
        lastFrame = time;
        setNow(Date.now());
      }
      raf = requestAnimationFrame(frame);
    };
    if (slow) {
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const colorOf = useMemo(
    () =>
      new Map(
        lines.map((line, index) => [line.id, PALETTE[index % PALETTE.length]!]),
      ),
    [lines],
  );
  const visible = lines.filter((line) => !hidden.has(line.id));
  const live = now > 0;
  const windowStart = now - WINDOW_MS;
  const shown = ticks.filter((tick) => tick.t >= windowStart);
  const before =
    [...ticks].reverse().find((tick) => tick.t < windowStart) ?? null;
  const latestTick = ticks[ticks.length - 1] ?? null;

  const nowValue = (line: Line) =>
    latestTick?.values[line.id] ?? last(line.values);

  // Y scale over history and live values.
  const all = visible.flatMap((line) => [
    ...line.values.filter((value): value is number => value !== null),
    ...shown
      .map((tick) => tick.values[line.id])
      .filter((value): value is number => value !== undefined),
  ]);
  let lo = all.length ? Math.min(...all) : 0;
  let hi = all.length ? Math.max(...all) : 100;
  const log = view === "research";
  const tv = (value: number) =>
    log ? Math.log10(Math.max(value, 0.3)) : value;
  if (log) {
    lo = Math.floor(tv(lo));
    hi = Math.ceil(tv(hi) + 0.05);
  } else {
    const span = Math.max(hi - lo, 12);
    lo = Math.max(0, lo - span * 0.18);
    hi = Math.min(100, hi + span * 0.18);
  }
  const x = (index: number) =>
    PAD.left + (end === 0 ? 0 : (index / end) * (LIVE_LEFT - PAD.left));
  const tx = (t: number) => LIVE_LEFT + (1 - (now - t) / WINDOW_MS) * LIVE_W;
  const y = (value: number) =>
    PAD.top + (1 - (tv(value) - lo) / (hi - lo || 1)) * INNER_H;
  const ticksY = log
    ? Array.from({ length: hi - lo + 1 }, (_, index) => 10 ** (lo + index))
    : niceTicks(lo, hi, 5);

  const historyPath = (line: Line) =>
    line.values
      .map((value, index) =>
        value === null ? null : `${x(index).toFixed(1)},${y(value).toFixed(1)}`,
      )
      .filter(Boolean)
      .map((point, index) => `${index === 0 ? "M" : "L"}${point}`)
      .join(" ");

  const livePath = (line: Line) => {
    const start = before?.values[line.id] ?? last(line.values);
    if (start === null || start === undefined) return "";
    const parts = [`M${LIVE_LEFT.toFixed(1)},${y(start).toFixed(1)}`];
    for (const tick of shown) {
      const value = tick.values[line.id];
      if (value !== undefined)
        parts.push(`L${tx(tick.t).toFixed(1)},${y(value).toFixed(1)}`);
    }
    const head = nowValue(line);
    if (head !== null && head !== undefined)
      parts.push(`L${LIVE_RIGHT.toFixed(1)},${y(head).toFixed(1)}`);
    return parts.join(" ");
  };

  const fullPath = (line: Line) =>
    `${historyPath(line)} ${live ? livePath(line).replace(/^M/, "L") : ""}`;

  // What the cursor (or "now") is reading.
  const reading: Reading = (() => {
    const historyValues = (index: number) =>
      new Map(visible.map((line) => [line.id, line.values[index] ?? null]));
    if (hoverPx !== null && hoverPx <= LIVE_LEFT + 2) {
      const index = Math.max(
        0,
        Math.min(
          end,
          Math.round(((hoverPx - PAD.left) / (LIVE_LEFT - PAD.left)) * end),
        ),
      );
      return {
        label: labels[index]!,
        values: historyValues(index),
        before: index > 0 ? historyValues(index - 1) : null,
        x: x(index),
      };
    }
    const lastHistory = historyValues(end);
    if (hoverPx !== null && live) {
      const t = now - (1 - (hoverPx - LIVE_LEFT) / LIVE_W) * WINDOW_MS;
      const tick = [...ticks].reverse().find((item) => item.t <= t);
      return {
        label: clockOf(t),
        values: new Map(
          visible.map((line) => [
            line.id,
            tick?.values[line.id] ?? last(line.values),
          ]),
        ),
        before: lastHistory,
        x: hoverPx,
      };
    }
    return {
      label: "Now",
      values: new Map(visible.map((line) => [line.id, nowValue(line) ?? null])),
      before: lastHistory,
      x: LIVE_RIGHT,
    };
  })();
  const beforeLabel =
    hoverPx !== null && hoverPx <= LIVE_LEFT + 2
      ? "vs year before"
      : `vs ${labels[end]}`;

  // Name tags at the live head, pushed apart so they never overlap.
  const tags = visible
    .map((line) => ({ line, value: nowValue(line) }))
    .filter(
      (tag): tag is { line: Line; value: number } =>
        tag.value !== null && tag.value !== undefined,
    )
    .map((tag) => ({ ...tag, ty: y(tag.value) }))
    .sort((a, b) => a.ty - b.ty);
  for (let index = 1; index < tags.length; index += 1)
    tags[index]!.ty = Math.max(tags[index]!.ty, tags[index - 1]!.ty + 25);
  const overflow = tags.length
    ? tags[tags.length - 1]!.ty - (H - PAD.bottom + 4)
    : 0;
  if (overflow > 0) for (const tag of tags) tag.ty -= overflow;

  // Headline tiles: compared with where each line started.
  const changes = visible
    .map((line) => {
      const start = first(line.values);
      const value = reading.values.get(line.id) ?? null;
      return start === null || value === null
        ? null
        : { line, value, change: value - start };
    })
    .filter(
      (item): item is { line: Line; value: number; change: number } =>
        item !== null,
    );
  const leader = [...changes].sort((a, b) => b.value - a.value)[0];
  const climber = [...changes].sort((a, b) => b.change - a.change)[0];
  const faller = [...changes].sort((a, b) => a.change - b.change)[0];

  const rows = visible
    .map((line) => ({
      line,
      value: reading.values.get(line.id) ?? null,
      prev: reading.before?.get(line.id) ?? null,
    }))
    .filter(
      (row): row is { line: Line; value: number; prev: number | null } =>
        row.value !== null,
    )
    .sort((a, b) => b.value - a.value);

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((event.clientX - box.left) / box.width) * W;
    setHoverPx(
      px < PAD.left - 10 || px > LIVE_RIGHT + 6
        ? null
        : Math.min(LIVE_RIGHT, Math.max(PAD.left, px)),
    );
  };

  const toggle = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < lines.length - 1) next.add(id);
      return next;
    });

  const deltaColor = (value: number) =>
    value >= 0.05 ? UP : value <= -0.05 ? DOWN : "var(--ink-3)";

  // Moving grid of the live zone: a line every 15 s, a time label every 30 s.
  const grid: { t: number; label: boolean }[] = [];
  if (live)
    for (
      let t = Math.floor(now / 15_000) * 15_000;
      t >= windowStart;
      t -= 15_000
    )
      grid.push({ t, label: t % 60_000 === 0 });
  const startLabel = labels[0] ?? "";

  return (
    <div className="mt-5">
      {/* Same strip as the Task X-Ray plan: one card, three steps */}
      <div className="grid overflow-hidden rounded-2xl border border-line-strong/60 bg-card shadow-[0_14px_34px_-26px_rgb(0_0_0/45%)] sm:grid-cols-3">
        <Tile
          icon="★"
          tone="#2F6BFF"
          label={`Top · ${reading.label}`}
          name={leader?.line.label ?? "–"}
          value={leader ? fmt(leader.value, digits) : null}
        />
        <Tile
          icon="▲"
          tone={UP}
          label={`Climbed most since ${startLabel}`}
          name={
            climber && climber.change > 0 ? climber.line.label : "No climbs"
          }
          value={
            climber && climber.change > 0
              ? signed(climber.change, digits)
              : null
          }
          className="border-t border-line sm:border-t-0 sm:border-l"
        />
        <Tile
          icon="▼"
          tone={DOWN}
          label={`Fell most since ${startLabel}`}
          name={faller && faller.change < 0 ? faller.line.label : "No falls"}
          value={
            faller && faller.change < 0 ? signed(faller.change, digits) : null
          }
          className="border-t border-line sm:border-t-0 sm:border-l"
        />
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="relative min-w-[680px] sm:min-w-0">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none"
            onPointerMove={move}
            onPointerLeave={() => setHoverPx(null)}
            role="img"
            aria-label={`${unit} of ${lines.map((line) => line.label).join(", ")} from ${labels[0]} to now, with a live feed`}
          >
            <defs>
              <clipPath id={`plot-${uid}`}>
                <rect
                  x={PAD.left - 8}
                  y={0}
                  width={LIVE_RIGHT - PAD.left + 8}
                  height={H}
                />
              </clipPath>
              <linearGradient id={`livebg-${uid}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={LIVE} stopOpacity={0} />
                <stop offset="100%" stopColor={LIVE} stopOpacity={0.07} />
              </linearGradient>
              {lines.map((line) => (
                <linearGradient
                  key={line.id}
                  id={`fill-${uid}-${line.id}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={colorOf.get(line.id)}
                    stopOpacity={0.26}
                  />
                  <stop
                    offset="100%"
                    stopColor={colorOf.get(line.id)}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            {/* Plot backgrounds: history, then the live zone */}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={LIVE_LEFT - PAD.left}
              height={INNER_H}
              fill="#2a78d6"
              fillOpacity={0.035}
            />
            <rect
              x={LIVE_LEFT}
              y={PAD.top}
              width={LIVE_W}
              height={INNER_H}
              fill={`url(#livebg-${uid})`}
            />
            <line
              x1={LIVE_LEFT}
              x2={LIVE_LEFT}
              y1={PAD.top - 8}
              y2={H - PAD.bottom}
              stroke={LIVE}
              strokeOpacity={0.45}
              strokeDasharray="3 4"
            />

            {ticksY.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={LIVE_RIGHT}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--line)"
                  strokeDasharray="3 5"
                />
                <text
                  x={PAD.left - 10}
                  y={y(tick) + 4}
                  textAnchor="end"
                  fontSize={13}
                  fill="var(--ink-3)"
                  className="font-mono"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            ))}

            {labels.map((label, index) => {
              const active = reading.label === label;
              return (
                <g key={label}>
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke="var(--line)"
                    strokeOpacity={0.6}
                  />
                  <text
                    x={x(index)}
                    y={H - 12}
                    textAnchor="middle"
                    fontSize={13.5}
                    fontWeight={active ? 700 : 500}
                    fill={active ? "var(--ink)" : "var(--ink-3)"}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {grid.map(({ t, label }) => {
              const gx = tx(t);
              return (
                <g key={t}>
                  <line
                    x1={gx}
                    x2={gx}
                    y1={PAD.top}
                    y2={H - PAD.bottom}
                    stroke={LIVE}
                    strokeOpacity={0.12}
                  />
                  {label && gx > LIVE_LEFT + 52 && gx < LIVE_RIGHT - 52 ? (
                    <text
                      x={gx}
                      y={H - 12}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--ink-3)"
                      className="font-mono"
                    >
                      {clockOf(t)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {live ? (
              <text
                x={LIVE_RIGHT}
                y={H - 12}
                textAnchor="end"
                fontSize={12}
                fontWeight={700}
                fill={LIVE}
              >
                Now
              </text>
            ) : null}

            {/* The lines: history and the running live tail as one path */}
            <g clipPath={`url(#plot-${uid})`}>
              {visible.map((line) => {
                const color = colorOf.get(line.id)!;
                const dim = focus !== null && focus !== line.id;
                const strong = focus === line.id;
                const d = fullPath(line);
                const firstIndex = line.values.findIndex(
                  (value) => value !== null,
                );
                return (
                  <g
                    key={line.id}
                    style={{
                      opacity: dim ? 0.15 : 1,
                      transition: "opacity 180ms",
                    }}
                  >
                    {strong || visible.length <= 2 ? (
                      <path
                        d={`${d} L${live ? LIVE_RIGHT : x(end)},${H - PAD.bottom} L${x(firstIndex)},${H - PAD.bottom} Z`}
                        fill={`url(#fill-${uid}-${line.id})`}
                      />
                    ) : null}
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={strong ? 4.5 : 3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="#fff"
                      strokeOpacity={0.8}
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      className="nx-flow"
                      pointerEvents="none"
                    />
                    {line.values.map((value, index) =>
                      value === null ? null : (
                        <circle
                          key={index}
                          cx={x(index)}
                          cy={y(value)}
                          r={reading.label === labels[index] ? 5.5 : 3.5}
                          fill="var(--card)"
                          stroke={color}
                          strokeWidth={2.5}
                        />
                      ),
                    )}
                    {shown.map((tick) =>
                      tick.values[line.id] === undefined ? null : (
                        <circle
                          key={tick.t}
                          cx={tx(tick.t)}
                          cy={y(tick.values[line.id]!)}
                          r={2}
                          fill={color}
                        />
                      ),
                    )}
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ cursor: "pointer" }}
                      onPointerEnter={() => setFocus(line.id)}
                      onPointerLeave={() => setFocus(null)}
                    />
                  </g>
                );
              })}
            </g>

            {/* Live heads */}
            {live
              ? tags.map(({ line, value }) => {
                  const color = colorOf.get(line.id)!;
                  const dim = focus !== null && focus !== line.id;
                  return (
                    <g
                      key={`head-${line.id}`}
                      style={{ opacity: dim ? 0.2 : 1 }}
                      pointerEvents="none"
                    >
                      <circle
                        cx={LIVE_RIGHT}
                        cy={y(value)}
                        r={6}
                        fill={color}
                        opacity={0.35}
                      >
                        <animate
                          attributeName="r"
                          values="6;14;6"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.35;0;0.35"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={LIVE_RIGHT}
                        cy={y(value)}
                        r={5.5}
                        fill={color}
                        stroke="var(--card)"
                        strokeWidth={2.5}
                      />
                    </g>
                  );
                })
              : null}

            {/* Name tags beside the heads */}
            {tags.map(({ line, value, ty }) => {
              const color = colorOf.get(line.id)!;
              const dim = focus !== null && focus !== line.id;
              const change = value - (first(line.values) ?? value);
              const name =
                line.label.length > 17
                  ? `${line.label.slice(0, 16)}…`
                  : line.label;
              const tagX = LIVE_RIGHT + 18;
              const headX = live ? LIVE_RIGHT : x(end);
              return (
                <g
                  key={`tag-${line.id}`}
                  style={{ opacity: dim ? 0.25 : 1, cursor: "pointer" }}
                  onPointerEnter={() => setFocus(line.id)}
                  onPointerLeave={() => setFocus(null)}
                >
                  <path
                    d={`M${headX + 7},${y(value)} C${tagX - 8},${y(value)} ${tagX - 12},${ty} ${tagX - 2},${ty}`}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.4}
                  />
                  <rect
                    x={tagX}
                    y={ty - 11.5}
                    width={PAD.right - 22}
                    height={23}
                    rx={11.5}
                    fill={color}
                    fillOpacity={focus === line.id ? 0.22 : 0.1}
                  />
                  <circle cx={tagX + 10} cy={ty} r={4} fill={color} />
                  <text
                    x={tagX + 20}
                    y={ty + 4.5}
                    fontSize={13.5}
                    fontWeight={focus === line.id ? 700 : 500}
                    fill="var(--ink)"
                  >
                    {name}
                  </text>
                  <text
                    x={tagX + PAD.right - 30}
                    y={ty + 4.5}
                    textAnchor="end"
                    fontSize={12.5}
                    fontWeight={700}
                    fill={deltaColor(change)}
                    className="font-mono"
                  >
                    {signed(change, digits)}
                  </text>
                </g>
              );
            })}

            {hoverPx !== null ? (
              <line
                x1={reading.x}
                x2={reading.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--ink)"
                strokeOpacity={0.35}
              />
            ) : null}
          </svg>

          {/* Live badge over the live zone */}
          <div
            className="pointer-events-none absolute top-0 flex items-center gap-1.5 rounded-full border border-[#e3494833] bg-card/90 px-2.5 py-0.5 font-mono text-[11px] backdrop-blur"
            style={{
              left: `${(LIVE_LEFT / W) * 100}%`,
              transform: "translateX(8px)",
            }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e34948] opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-[#e34948]" />
            </span>
            <span className="font-semibold tracking-[0.08em] text-[#e34948]">
              LIVE
            </span>
            <span className="text-ink-2">
              {live ? clockOf(now) : "--:--:--"}
            </span>
          </div>

          {hoverPx !== null && rows.length > 0 ? (
            <div
              className="pointer-events-none absolute top-10 z-10 w-64 rounded-xl border border-line bg-card/95 p-3 shadow-[0_14px_34px_-14px_rgba(0,0,0,0.4)] backdrop-blur"
              style={{
                left: `${(reading.x / W) * 100}%`,
                transform:
                  reading.x > W * 0.45
                    ? "translateX(calc(-100% - 14px))"
                    : "translateX(14px)",
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold">{reading.label}</p>
                <p className="text-[10.5px] text-ink-3">{beforeLabel}</p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {rows.map(({ line, value, prev }) => (
                  <li
                    key={line.id}
                    className="flex items-center gap-2 text-[12.5px]"
                  >
                    <span
                      className="h-2.5 w-1 shrink-0 rounded-full"
                      style={{ background: colorOf.get(line.id) }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {line.label}
                    </span>
                    <span className="font-mono font-medium">
                      {fmt(value, digits)}
                    </span>
                    <span
                      className="w-11 text-right font-mono text-[11px]"
                      style={{
                        color:
                          prev === null
                            ? "var(--ink-3)"
                            : deltaColor(value - prev),
                      }}
                    >
                      {prev === null ? "" : signed(value - prev, digits)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Legend: hover to focus, click to hide */}
      <div className="mt-4 flex flex-wrap gap-2">
        {lines.map((line) => {
          const color = colorOf.get(line.id)!;
          const off = hidden.has(line.id);
          const delta = (nowValue(line) ?? 0) - (first(line.values) ?? 0);
          return (
            <button
              key={line.id}
              onClick={() => toggle(line.id)}
              onPointerEnter={() => !off && setFocus(line.id)}
              onPointerLeave={() => setFocus(null)}
              className={cn(
                "nx-focus flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-all",
                off
                  ? "border-line bg-paper-2 text-ink-3 line-through"
                  : "font-medium",
              )}
              style={
                off
                  ? undefined
                  : { borderColor: `${color}66`, background: `${color}14` }
              }
            >
              <span
                className="h-1 w-4 rounded-full"
                style={{ background: off ? "var(--line-strong)" : color }}
              />
              {line.mine && view !== "roles" ? (
                <span
                  className="size-1.5 rounded-full bg-saffron"
                  title="Your skill"
                />
              ) : null}
              {line.label}
              <span
                className="font-mono text-[11px]"
                style={{ color: off ? undefined : deltaColor(delta) }}
              >
                {signed(delta, digits)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tile({
  icon,
  tone,
  label,
  name,
  value,
  className,
}: {
  icon: string;
  tone: string;
  label: string;
  name: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5", className)}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
        style={{ background: tone }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="nx-micro block truncate text-[10.5px] text-ink-3">
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          <span
            className="truncate text-[15px] leading-snug font-medium"
            title={name}
          >
            {name}
          </span>
          {value ? (
            <span
              className="shrink-0 font-mono text-[13px] font-semibold"
              style={{ color: tone }}
            >
              {value}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function niceTicks(lo: number, hi: number, count: number) {
  const raw = (hi - lo) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let tick = Math.ceil(lo / step) * step; tick <= hi; tick += step)
    ticks.push(Number(tick.toFixed(6)));
  return ticks;
}

/* ------------------------------------------------------------------ labour */

function Labour({ readings }: { readings: SignalSnapshot[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const labour = [...readings]
    .reverse()
    .find((snapshot) => snapshot.labour && snapshot.labour.length > 0)?.labour;
  if (!labour) return null;
  const series = [...labour].sort((a, b) => a.date.localeCompare(b.date));
  const LW = 600;
  const LH = 110;
  const rates = series.map((row) => row.unemploymentRate);
  const lo = Math.min(...rates) - 0.15;
  const hi = Math.max(...rates) + 0.15;
  const x = (index: number) =>
    8 + (index / Math.max(1, series.length - 1)) * (LW - 16);
  const y = (value: number) => 12 + (1 - (value - lo) / (hi - lo)) * (LH - 24);
  const d = series
    .map(
      (row, index) =>
        `${index === 0 ? "M" : "L"}${x(index)},${y(row.unemploymentRate)}`,
    )
    .join(" ");
  const index = hover ?? series.length - 1;
  const row = series[index]!;
  const change =
    series[series.length - 1]!.unemploymentRate - series[0]!.unemploymentRate;

  return (
    <Card className="grid gap-5 p-5 md:grid-cols-[230px_1fr] md:items-center">
      <div>
        <p className="nx-micro text-[11px] text-ink-3">
          Malaysia · unemployment
        </p>
        <p className="mt-2 font-mono text-[34px] leading-none font-semibold text-[#2a78d6]">
          {row.unemploymentRate.toFixed(1)}%
        </p>
        <p className="mt-1 text-[12.5px] text-ink-3">{monthYear(row.date)}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
          <span
            className="rounded-full px-2.5 py-1 font-mono"
            style={{
              color: change <= 0 ? UP : DOWN,
              background: change <= 0 ? "#0e7a4b14" : "#ce2c2c14",
            }}
          >
            {sign(change, 1)} pts / year
          </span>
          <span className="rounded-full bg-paper-2 px-2.5 py-1 font-mono">
            {(row.employed / 1000).toFixed(2)}M employed
          </span>
        </div>
      </div>
      <div>
        <svg
          viewBox={`0 0 ${LW} ${LH}`}
          className="w-full touch-none"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const px = ((event.clientX - box.left) / box.width) * LW;
            setHover(
              Math.max(
                0,
                Math.min(
                  series.length - 1,
                  Math.round(((px - 8) / (LW - 16)) * (series.length - 1)),
                ),
              ),
            );
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="labour-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2a78d6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${d} L${x(series.length - 1)},${LH} L${x(0)},${LH} Z`}
            fill="url(#labour-fill)"
          />
          <path
            d={d}
            fill="none"
            stroke="#2a78d6"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={0}
              y2={LH}
              stroke="var(--ink)"
              strokeOpacity={0.2}
            />
          ) : null}
          <circle
            cx={x(index)}
            cy={y(row.unemploymentRate)}
            r={5}
            fill="#2a78d6"
            stroke="var(--card)"
            strokeWidth={2}
          />
        </svg>
        <SourceLine className="mt-2">
          OpenDOSM Labour Force Survey · api.data.gov.my
        </SourceLine>
      </div>
    </Card>
  );
}
