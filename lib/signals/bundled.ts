import signalFile from "@/data/signals.json";

import type { SignalSnapshot } from "./snapshot";

/** The two dated snapshots shipped with the app, oldest first. */
export const BUNDLED_SNAPSHOTS = signalFile.snapshots as SignalSnapshot[];

export const LATEST_BUNDLED = BUNDLED_SNAPSHOTS[BUNDLED_SNAPSHOTS.length - 1]!;
export const PREVIOUS_BUNDLED = BUNDLED_SNAPSHOTS[0]!;
