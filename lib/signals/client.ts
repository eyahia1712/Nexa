"use client";

import liveSeed from "@/data/live-seed.json";
import { SKILLS } from "@/lib/catalog";

import { LATEST_BUNDLED } from "./bundled";
import type { DateWindow, LabourMonth } from "./fetchers";
import { rollingWindow, type SignalSnapshot } from "./snapshot";

/**
 * Live readings, driven from the browser so they work the same on any host
 * (including serverless ones like Vercel). The server only answers single
 * questions (/api/arxiv, /api/labour); the browser asks them one by one,
 * with arXiv's requested pause between calls, and keeps the result.
 */

export const LIVE_SEED = liveSeed as SignalSnapshot;
const STORAGE_KEY = "nexa.live.v1";
const GAP_MS = 3_100;

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** One arXiv count through our server (null when arXiv did not answer). */
export async function arxivCountVia(
  q: string,
  window: DateWindow,
): Promise<number | null> {
  try {
    const response = await fetch(
      `/api/arxiv?q=${encodeURIComponent(q)}&from=${window.from}&to=${window.to}`,
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { count?: number };
    return typeof body.count === "number" ? body.count : null;
  } catch {
    return null;
  }
}

export function loadLive(): SignalSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SignalSnapshot;
  } catch {
    // Storage unavailable: fall back to the shipped reading.
  }
  return LIVE_SEED;
}

function saveLive(snapshot: SignalSnapshot) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // The reading still applies for this visit.
  }
}

/** A full live reading: arXiv for every skill (this window and a year earlier) plus OpenDOSM. */
export async function takeLiveReading(
  onProgress: (done: number, total: number) => void,
): Promise<SignalSnapshot> {
  const today = new Date();
  const window = rollingWindow(today);
  const queried = SKILLS.filter((skill) => skill.arxiv !== null);
  const steps = 2 + queried.length * 2 + 1;
  let done = 0;
  const errors: string[] = [];
  const ask = async (q: string, range: DateWindow, label: string) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const value = await arxivCountVia(q, range);
      if (value !== null) {
        onProgress(++done, steps);
        await sleep(GAP_MS);
        return value;
      }
      await sleep(GAP_MS * 2);
    }
    errors.push(`${label}: arXiv did not answer`);
    onProgress(++done, steps);
    return null;
  };

  const current = await ask("total", window.current, "arXiv total (current)");
  const previous = await ask(
    "total",
    window.previous,
    "arXiv total (previous)",
  );
  if (current === null || previous === null)
    throw new Error("arXiv did not answer");
  const skills: SignalSnapshot["arxiv"]["skills"] = {};
  for (const skill of queried) {
    const now = await ask(skill.id, window.current, `${skill.id} (current)`);
    const before = await ask(
      skill.id,
      window.previous,
      `${skill.id} (previous)`,
    );
    if (now !== null && before !== null)
      skills[skill.id] = {
        query: skill.arxiv!,
        current: now,
        previous: before,
      };
  }
  // Skills arXiv refused keep their latest bundled reading (with its own baseline), and say so.
  for (const [id, reading] of Object.entries(LATEST_BUNDLED.arxiv.skills)) {
    if (!skills[id])
      skills[id] = {
        ...reading,
        carriedFrom: LATEST_BUNDLED.label,
        total: LATEST_BUNDLED.arxiv.total,
      };
  }

  let labour: LabourMonth[] | null = null;
  try {
    const response = await fetch("/api/labour");
    if (response.ok)
      labour = ((await response.json()) as { labour: LabourMonth[] }).labour;
  } catch {
    errors.push("OpenDOSM did not answer");
  }
  onProgress(++done, steps);

  const day = today.toISOString().slice(0, 10);
  const snapshot: SignalSnapshot = {
    id: `live-${day}`,
    label: `Live reading, ${today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    kind: "live",
    asOf: day,
    fetchedAt: today.toISOString(),
    window,
    arxiv: { total: { current, previous }, skills },
    labour,
    errors,
  };
  saveLive(snapshot);
  return snapshot;
}
