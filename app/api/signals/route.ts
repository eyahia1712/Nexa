import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { SKILLS } from "@/lib/catalog";
import { LATEST_BUNDLED } from "@/lib/signals/bundled";
import { buildSnapshot, rollingWindow, type SignalSnapshot } from "@/lib/signals/snapshot";

/**
 * Live trend signals.
 *   GET  → the last live reading (if any) and the state of a running refresh
 *   POST → start a refresh: query arXiv and OpenDOSM now (about 80 seconds — arXiv asks for 3 s between calls)
 * The finished reading is saved to data/cache/live-signals.json so it
 * survives restarts. If anything fails, the app keeps using the dated
 * bundled snapshot and says so.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = path.join(process.cwd(), "data", "cache", "live-signals.json");

interface Job {
  state: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  step: string;
  startedAt: string | null;
  error: string | null;
}

const globalJob = globalThis as unknown as { __nexaSignalJob?: Job };
const job = (): Job => (globalJob.__nexaSignalJob ??= { state: "idle", done: 0, total: 0, step: "", startedAt: null, error: null });

async function readCached(): Promise<SignalSnapshot | null> {
  try {
    return JSON.parse(await readFile(CACHE, "utf8")) as SignalSnapshot;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ job: job(), live: await readCached() });
}

export async function POST() {
  const current = job();
  if (current.state === "running") return NextResponse.json({ job: current }, { status: 202 });

  Object.assign(current, { state: "running", done: 0, total: 0, step: "Starting", startedAt: new Date().toISOString(), error: null });
  const today = new Date();
  void buildSnapshot(SKILLS, {
    id: `live-${today.toISOString().slice(0, 10)}`,
    label: `Live reading, ${today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
    kind: "live",
    asOf: today.toISOString().slice(0, 10),
    window: rollingWindow(today),
    delayMs: 3_100,
    withLabour: true,
    onProgress: (done, total, step) => Object.assign(current, { done, total, step }),
  })
    .then(async (snapshot) => {
      const measured = Object.keys(snapshot.arxiv.skills).length;
      if (!Number.isFinite(snapshot.arxiv.total.current) || measured === 0) {
        throw new Error(snapshot.errors[0] ?? "arXiv did not answer");
      }
      // arXiv throttles bursts; any skill it refused keeps its latest bundled
      // reading (with that reading's own baseline) and says so.
      for (const [id, reading] of Object.entries(LATEST_BUNDLED.arxiv.skills)) {
        if (!snapshot.arxiv.skills[id]) {
          snapshot.arxiv.skills[id] = { ...reading, carriedFrom: LATEST_BUNDLED.label, total: LATEST_BUNDLED.arxiv.total };
        }
      }
      await mkdir(path.dirname(CACHE), { recursive: true });
      await writeFile(CACHE, JSON.stringify(snapshot, null, 1));
      Object.assign(current, { state: "done", step: `Done — ${measured} skills measured` });
    })
    .catch((error: Error) => Object.assign(current, { state: "failed", error: error.message }));

  return NextResponse.json({ job: current }, { status: 202 });
}
