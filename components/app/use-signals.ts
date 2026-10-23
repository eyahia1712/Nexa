"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { momentumFor } from "@/lib/engine/changes";
import type { ScenarioId } from "@/lib/engine/scenarios";
import { BUNDLED_SNAPSHOTS, LATEST_BUNDLED } from "@/lib/signals/bundled";
import { LIVE_SEED, loadLive, takeLiveReading } from "@/lib/signals/client";
import type { SignalSnapshot } from "@/lib/signals/snapshot";

/**
 * Shared trend-evidence state for both dashboards: which snapshot is active
 * (a bundled reading or a live one), the scenario, and the live refresh job.
 * Live readings run in the browser (see lib/signals/client.ts), so they work
 * the same on any host.
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
  const [live, setLive] = useState<SignalSnapshot | null>(LIVE_SEED);
  const [snapshotId, setSnapshotId] = useState<string>(LATEST_BUNDLED.id);
  const [job, setJob] = useState<RefreshJob | null>(null);
  const runningRef = useRef(false);

  // A reading taken earlier in this browser replaces the shipped one.
  useEffect(() => {
    setLive(loadLive());
  }, []);

  const snapshots = useMemo(
    () => (live ? [...BUNDLED_SNAPSHOTS, live] : BUNDLED_SNAPSHOTS),
    [live],
  );
  const snapshot =
    snapshots.find((item) => item.id === snapshotId) ?? LATEST_BUNDLED;
  const momentum = useMemo(() => momentumFor(snapshot), [snapshot]);

  const refresh = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setJob({
      state: "running",
      done: 0,
      total: 0,
      step: "Starting",
      error: null,
    });
    try {
      const reading = await takeLiveReading((done, total) =>
        setJob({
          state: "running",
          done,
          total,
          step: "Querying arXiv & OpenDOSM",
          error: null,
        }),
      );
      setLive(reading);
      setSnapshotId(reading.id);
      setJob({ state: "done", done: 1, total: 1, step: "Done", error: null });
    } catch (error) {
      setJob({
        state: "failed",
        done: 0,
        total: 0,
        step: "",
        error: (error as Error).message,
      });
    } finally {
      runningRef.current = false;
    }
  }, []);

  return {
    scenario,
    setScenario,
    snapshot,
    snapshots,
    snapshotId,
    setSnapshotId,
    momentum,
    live,
    job,
    refresh,
  };
}

export type SignalsState = ReturnType<typeof useSignals>;
