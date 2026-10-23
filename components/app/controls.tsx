"use client";

import { useEffect, useRef, useState } from "react";

import { SCENARIOS, SCENARIO_ORDER, type ScenarioId } from "@/lib/engine/scenarios";
import { cn, formatDate } from "@/lib/utils";

import type { SignalsState } from "./use-signals";

/** Slow · Moderate · Fast — available everywhere, always visible. */
export function ScenarioSwitch({ value, onChange, className }: { value: ScenarioId; onChange: (id: ScenarioId) => void; className?: string }) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-line bg-card p-0.5", className)} role="radiogroup" aria-label="AI disruption scenario">
      {SCENARIO_ORDER.map((id) => (
        <button
          key={id}
          role="radio"
          aria-checked={value === id}
          title={SCENARIOS[id].description}
          onClick={() => onChange(id)}
          className={cn(
            "nx-focus inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
            value === id ? "bg-paper-2 text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]" : "text-ink-2 hover:text-ink",
          )}
        >
          <span className={cn("size-1.5 rounded-full", id === "slow" ? "bg-human" : id === "moderate" ? "bg-assist" : "bg-auto")} />
          {SCENARIOS[id].short}
        </button>
      ))}
    </div>
  );
}

/** Which evidence is in use, how old it is, and the live refresh. */
export function EvidenceChip({ signals }: { signals: SignalsState }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const running = signals.job?.state === "running";
  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="nx-focus inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-[13px] hover:border-line-strong"
        aria-expanded={open}
      >
        <span className={cn("size-2 rounded-full", signals.snapshot.kind === "live" ? "bg-human" : "bg-saffron", running && "nx-live")} />
        <span className="hidden sm:inline">Signals:</span> {signals.snapshot.kind === "live" ? "Live" : formatDate(signals.snapshot.asOf).replace(/^\d+ /, "")}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[330px] rounded-xl border border-line bg-card p-4 shadow-[0_18px_40px_-20px_rgb(0_0_0/35%)]">
          <p className="nx-micro text-ink-3">Trend evidence in use</p>
          <div className="mt-2 space-y-1.5">
            {signals.snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                onClick={() => signals.setSnapshotId(snapshot.id)}
                className={cn(
                  "nx-focus flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  snapshot.id === signals.snapshot.id ? "border-ink bg-paper-2" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", snapshot.kind === "live" ? "bg-human" : "bg-saffron")} />
                <span>
                  <span className="block text-[13.5px] font-medium">{snapshot.label}</span>
                  <span className="block text-[12px] text-ink-3">
                    arXiv {snapshot.window.current.from} → {snapshot.window.current.to} · fetched {formatDate(snapshot.fetchedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => void signals.refresh()}
            disabled={running}
            className="nx-micro nx-focus mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-saffron text-saffron-deep disabled:opacity-60"
          >
            {running ? `Querying arXiv & OpenDOSM… ${signals.job?.done ?? 0}/${signals.job?.total || "…"}` : "Refresh signals now"}
          </button>
          {signals.job?.state === "failed" ? (
            <p className="mt-2 text-[12px] text-auto">Live refresh failed ({signals.job.error}). Still using the dated reading above.</p>
          ) : null}
          <p className="mt-2 text-[11.5px] leading-snug text-ink-3">Live refresh queries the arXiv API and OpenDOSM now and recomputes every score. Takes about 80 seconds (arXiv asks for a pause between calls).</p>
        </div>
      ) : null}
    </div>
  );
}
