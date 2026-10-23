import { arxivCount, dosmLabour, sleep, type DateWindow, type LabourMonth } from "./fetchers";

/**
 * A snapshot is one dated reading of every trend source. Nexa ships two
 * bundled snapshots (so the demo works offline and judges can see how the
 * forecast moved over a year) and can take a live one on demand.
 */
export interface SignalSnapshot {
  id: string;
  label: string;
  kind: "bundled" | "live";
  /** The date the readings describe. */
  asOf: string;
  /** When the readings were fetched from the APIs. */
  fetchedAt: string;
  window: { current: DateWindow; previous: DateWindow };
  arxiv: {
    total: { current: number; previous: number };
    skills: Record<
      string,
      {
        query: string;
        current: number;
        previous: number;
        /** Set when the live query failed and this reading was carried over from an earlier snapshot. */
        carriedFrom?: string;
        /** arXiv totals of the snapshot the reading came from, when carried over. */
        total?: { current: number; previous: number };
      }
    >;
  };
  labour: LabourMonth[] | null;
  errors: string[];
}

export interface SkillQuery {
  id: string;
  arxiv: string | null;
}

export interface BuildOptions {
  id: string;
  label: string;
  kind: SignalSnapshot["kind"];
  asOf: string;
  window: { current: DateWindow; previous: DateWindow };
  /** Pause between arXiv calls; the API asks for about 3 seconds. */
  delayMs?: number;
  withLabour?: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}

export async function buildSnapshot(skills: SkillQuery[], options: BuildOptions): Promise<SignalSnapshot> {
  const delay = options.delayMs ?? 3_100;
  const queried = skills.filter((skill): skill is { id: string; arxiv: string } => skill.arxiv !== null);
  const steps = 2 + queried.length * 2 + (options.withLabour ? 1 : 0);
  let done = 0;
  const errors: string[] = [];
  const tick = (label: string) => options.onProgress?.(++done, steps, label);

  const count = async (query: string | null, window: DateWindow, label: string): Promise<number> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const value = await arxivCount(query, window);
        tick(label);
        await sleep(delay);
        return value;
      } catch (error) {
        await sleep(delay * (attempt + 2));
        if (attempt === 2) {
          errors.push(`${label}: ${(error as Error).message}`);
          tick(label);
        }
      }
    }
    return Number.NaN;
  };

  const total = {
    current: await count(null, options.window.current, "arXiv total (current)"),
    previous: await count(null, options.window.previous, "arXiv total (previous)"),
  };
  const bySkill: SignalSnapshot["arxiv"]["skills"] = {};
  for (const skill of queried) {
    const current = await count(skill.arxiv, options.window.current, `${skill.id} (current)`);
    const previous = await count(skill.arxiv, options.window.previous, `${skill.id} (previous)`);
    if (Number.isFinite(current) && Number.isFinite(previous)) bySkill[skill.id] = { query: skill.arxiv, current, previous };
  }

  let labour: LabourMonth[] | null = null;
  if (options.withLabour) {
    try {
      labour = await dosmLabour(13);
    } catch (error) {
      errors.push(`OpenDOSM: ${(error as Error).message}`);
    }
    tick("OpenDOSM labour force");
  }

  return {
    id: options.id,
    label: options.label,
    kind: options.kind,
    asOf: options.asOf,
    fetchedAt: new Date().toISOString(),
    window: options.window,
    arxiv: { total, skills: bySkill },
    labour,
    errors,
  };
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The rolling window for a live reading: the last 90 days, ending a week ago
 * (arXiv indexing lags a few days), compared with the same 90 days a year
 * earlier, so seasonality cancels out.
 */
export function rollingWindow(today = new Date()): { current: DateWindow; previous: DateWindow } {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 7);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  const shift = (date: Date) => {
    const copy = new Date(date);
    copy.setUTCFullYear(copy.getUTCFullYear() - 1);
    return copy;
  };
  return {
    current: { from: iso(start), to: iso(end) },
    previous: { from: iso(shift(start)), to: iso(shift(end)) },
  };
}
