"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { momentumFor } from "@/lib/engine/changes";
import type { ScenarioId } from "@/lib/engine/scenarios";
import { BUNDLED_SNAPSHOTS, LATEST_BUNDLED } from "@/lib/signals/bundled";
import type { SignalSnapshot } from "@/lib/signals/snapshot";

/**
 * Shared trend-evidence state for both dashboards: which snapshot is active
 * (a bundled reading or a live one), the scenario, and the live refresh job.
 */

export interface RefreshJob {
  state: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  step: string;
  error: string | null;
}

export function useSignals() {
  const [scenario, setScenario] = useState<ScenarioId>("moderate");
  const [live, setLive] = useState<SignalSnapshot | null>(null);
  const [snapshotId, setSnapshotId] = useState<string>(LATEST_BUNDLED.id);
  const [job, setJob] = useState<RefreshJob | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const snapshots = useMemo(() => (live ? [...BUNDLED_SNAPSHOTS, live] : BUNDLED_SNAPSHOTS), [live]);
  const snapshot = snapshots.find((item) => item.id === snapshotId) ?? LATEST_BUNDLED;
  const momentum = useMemo(() => momentumFor(snapshot), [snapshot]);

  const poll = useCallback(async () => {
    const response = await fetch("/api/signals", { cache: "no-store" });
    const body = (await response.json()) as { job: RefreshJob; live: SignalSnapshot | null };
    setJob(body.job);
    if (body.live) setLive(body.live);
    return body;
  }, []);

  useEffect(() => {
    void poll().catch(() => undefined);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  const refresh = useCallback(async () => {
    await fetch("/api/signals", { method: "POST" });
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      const body = await poll().catch(() => null);
      if (!body || body.job.state === "done" || body.job.state === "failed") {
        if (timer.current) clearInterval(timer.current);
        if (body?.job.state === "done" && body.live) setSnapshotId(body.live.id);
      }
    }, 1500);
    setJob({ state: "running", done: 0, total: 0, step: "Starting", error: null });
  }, [poll]);

  return { scenario, setScenario, snapshot, snapshots, snapshotId, setSnapshotId, momentum, live, job, refresh };
}

export type SignalsState = ReturnType<typeof useSignals>;
