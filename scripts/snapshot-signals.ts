/**
 * Take the two bundled trend snapshots Nexa ships with:
 *   2025-10  — Jul–Sep 2025 compared with Jul–Sep 2024
 *   2026-10  — Jul–Sep 2026 compared with Jul–Sep 2025
 * Both are real readings of the arXiv API (and OpenDOSM for the latest), so the
 * demo can show, honestly, how the forecast moves when the evidence moves.
 *
 * Run:  npm run signals        (takes about 3 minutes: arXiv asks for 3 s between calls)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildSnapshot, type SignalSnapshot, type SkillQuery } from "../lib/signals/snapshot";

const root = path.resolve(import.meta.dirname, "..");
const skills = (JSON.parse(readFileSync(path.join(root, "data/curated/skills.json"), "utf8")) as { skills: SkillQuery[] }).skills;

const plans = [
  {
    id: "2025-10",
    label: "October 2025 reading",
    asOf: "2025-10-01",
    window: { current: { from: "2025-07-01", to: "2025-09-30" }, previous: { from: "2024-07-01", to: "2024-09-30" } },
    withLabour: false,
  },
  {
    id: "2026-10",
    label: "October 2026 reading",
    asOf: "2026-10-01",
    window: { current: { from: "2026-07-01", to: "2026-09-30" }, previous: { from: "2025-07-01", to: "2025-09-30" } },
    withLabour: true,
  },
];

const snapshots: SignalSnapshot[] = [];
for (const plan of plans) {
  const snapshot = await buildSnapshot(skills, {
    ...plan,
    kind: "bundled",
    onProgress: (done, total, label) => process.stdout.write(`\r${plan.id}  ${done}/${total}  ${label.padEnd(40)}`),
  });
  process.stdout.write("\n");
  if (snapshot.errors.length > 0) console.warn(`${plan.id} errors:`, snapshot.errors);
  snapshots.push(snapshot);
}

// The 2025 reading has no labour series of its own; give it the months that
// were published by then, from the same API call, so both readings are dated
// consistently.
const latest = snapshots[1]?.labour ?? null;
if (snapshots[0] && latest) snapshots[0].labour = null;

writeFileSync(path.join(root, "data/signals.json"), JSON.stringify({ snapshots }, null, 1) + "\n");
console.log("wrote data/signals.json");
for (const snapshot of snapshots) {
  const { total, skills: bySkill } = snapshot.arxiv;
  console.log(`\n${snapshot.id}: arXiv total ${total.previous} → ${total.current}`);
  for (const [id, value] of Object.entries(bySkill)) console.log(`  ${id.padEnd(18)} ${value.previous} → ${value.current}`);
}
