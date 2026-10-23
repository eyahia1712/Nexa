import historyFile from "@/data/history.json";

import { arxivCount, sleep } from "./fetchers";

/**
 * The always-on live feed behind "What changed". While someone is watching,
 * the server keeps asking arXiv how many papers on each skill were submitted
 * in the last 30 days, one question every few seconds (arXiv asks for at
 * least 3 s between calls), and records every answer with its time. It stops
 * by itself when nobody has looked for two minutes.
 */

const QUERIES = (historyFile as { queries: Record<string, string> }).queries;
const ROTATION: (string | null)[] = [null, ...Object.keys(QUERIES)];
const GAP_MS = 3_500;
const IDLE_MS = 120_000;
const KEEP = 900; // samples (~50 minutes)

export interface LiveSample {
  /** Epoch ms when this reading was taken. */
  t: number;
  /** Papers per 10,000 arXiv papers, last 30 days, for every skill measured so far. */
  perTenK: Record<string, number>;
  /** The skill (or "total") this sample refreshed. */
  updated: string;
}

interface StreamState {
  running: boolean;
  lastSeen: number;
  total: number | null;
  counts: Record<string, number>;
  samples: LiveSample[];
  error: string | null;
  cursor: number;
}

const store = globalThis as unknown as {
  __nexaLive?: StreamState;
  __nexaSignalJob?: { state: string };
};
const state = (): StreamState =>
  (store.__nexaLive ??= {
    running: false,
    lastSeen: 0,
    total: null,
    counts: {},
    samples: [],
    error: null,
    cursor: 0,
  });

function last30Days(now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

async function loop() {
  const live = state();
  live.running = true;
  try {
    while (Date.now() - live.lastSeen < IDLE_MS) {
      // Give way to a full "Take a live reading" job; both share arXiv's rate limit.
      if (store.__nexaSignalJob?.state === "running") {
        await sleep(GAP_MS);
        continue;
      }
      const id = ROTATION[live.cursor % ROTATION.length]!;
      live.cursor += 1;
      try {
        const count = await arxivCount(
          id === null ? null : QUERIES[id]!,
          last30Days(),
        );
        if (id === null) live.total = count;
        else live.counts[id] = count;
        live.error = null;
        if (live.total && live.total > 0) {
          const perTenK = Object.fromEntries(
            Object.entries(live.counts).map(([skill, value]) => [
              skill,
              (value / live.total!) * 10_000,
            ]),
          );
          live.samples.push({ t: Date.now(), perTenK, updated: id ?? "total" });
          if (live.samples.length > KEEP)
            live.samples.splice(0, live.samples.length - KEEP);
        }
      } catch (error) {
        live.error = (error as Error).message;
        await sleep(GAP_MS * 2);
      }
      await sleep(GAP_MS);
    }
  } finally {
    live.running = false;
  }
}

/** Mark that someone is watching, start the feed if needed, and return recent samples. */
export function watchLive(sinceMs: number) {
  const live = state();
  live.lastSeen = Date.now();
  if (!live.running) void loop();
  return {
    now: Date.now(),
    samples: live.samples.filter((sample) => sample.t >= sinceMs),
    error: live.error,
    window: last30Days(),
  };
}
