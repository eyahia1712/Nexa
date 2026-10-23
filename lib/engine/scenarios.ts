import type { Occupation } from "@/lib/catalog";

/**
 * Three futures instead of one prediction. Each scenario says how far AI use
 * spreads by 2030:
 *   adoption  — share of the tasks where AI use is ALREADY observed (Anthropic
 *               Economic Index) that are actually done with AI by 2030;
 *   spillover — share of the tasks with no observed use yet that AI reaches
 *               anyway as capabilities improve.
 * These are Nexa's stated assumptions, shown on the methodology page, not
 * measurements. Everything they multiply is measured.
 */
export type ScenarioId = "slow" | "moderate" | "fast";

export interface Scenario {
  id: ScenarioId;
  label: string;
  short: string;
  description: string;
  adoption: number;
  spillover: number;
  /** How strongly routine skills lose value (multiplies observed exposure). */
  routinePressure: number;
  /** Extra demand for AI-intensive roles in this future. */
  aiPull: number;
  /** Demand lost by exposed roles that do not use AI themselves. */
  exposurePenalty: number;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  slow: {
    id: "slow",
    label: "Slow disruption",
    short: "Slow",
    description: "AI keeps spreading at roughly today's pace. About half of the tasks where AI is already used are done with AI by 2030; few new tasks are reached.",
    adoption: 0.45,
    spillover: 0.05,
    routinePressure: 0.6,
    aiPull: 2,
    exposurePenalty: 5,
  },
  moderate: {
    id: "moderate",
    label: "Moderate disruption",
    short: "Moderate",
    description: "Most organisations adopt AI for the tasks it already handles; capabilities keep improving and reach some tasks with no AI use today.",
    adoption: 0.75,
    spillover: 0.15,
    routinePressure: 1,
    aiPull: 5,
    exposurePenalty: 10,
  },
  fast: {
    id: "fast",
    label: "Fast disruption",
    short: "Fast",
    description: "Almost every task with AI use today is done with AI by 2030, and agents reach a large share of tasks not yet observed.",
    adoption: 0.95,
    spillover: 0.3,
    routinePressure: 1.4,
    aiPull: 9,
    exposurePenalty: 18,
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ["slow", "moderate", "fast"];

export interface Shift {
  /** Central estimate: share of this job's task time done with AI by 2030. */
  value: number;
  low: number;
  high: number;
}

/** Share of a job's task time likely to be done with AI by 2030, as a range. */
export function taskShift(occupation: Pick<Occupation, "exposure">, scenario: Scenario): Shift {
  const exposure = occupation.exposure;
  const at = (adoption: number, spillover: number) => Math.min(1, exposure * adoption + (1 - exposure) * spillover);
  return {
    value: at(scenario.adoption, scenario.spillover),
    low: at(Math.max(0, scenario.adoption - 0.1), scenario.spillover * 0.6),
    high: at(Math.min(1, scenario.adoption + 0.1), Math.min(1, scenario.spillover * 1.4)),
  };
}
