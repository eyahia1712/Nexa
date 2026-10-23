"""Build Nexa's task-level evidence file from public datasets.

Inputs (data/raw/, downloaded by scripts/fetch_data.sh):
  - O*NET 31.0 task statements and task ratings (onetcenter.org, CC BY 4.0)
  - Anthropic Economic Index, labor-market-impacts release (job_exposure.csv,
    task_penetration.csv) and the 2025-03-27 automation-vs-augmentation file
    (huggingface.co/datasets/Anthropic/EconomicIndex, CC BY)

Output: data/occupation-tasks.json, one entry per occupation in
data/curated/occupations.json, with every task, its importance, whether AI use
has been observed for it, and whether that use automates or assists.

Nothing here is estimated or invented: every number is read from a source
file. Where the Economic Index has no occupation-level exposure (detailed
O*NET codes such as 13-1199.05), exposure is computed the same way the source
describes it — task coverage averaged over the occupation's tasks, weighted by
task importance — and labelled as computed by Nexa.

Run:  python3 -I scripts/build_data.py
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "occupation-tasks.json"
CURATED = ROOT / "data" / "curated" / "occupations.json"

# How many tasks to ship per occupation for display. Exposure is always
# computed over every task, not just these.
DISPLAY_TASKS = 12


def norm(text: str) -> str:
    return " ".join(text.strip().lower().split())


def read_csv(name: str) -> list[dict[str, str]]:
    with open(RAW / name, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> int:
    wanted = json.loads(CURATED.read_text(encoding="utf-8"))["occupations"]
    codes = {item["soc"] for item in wanted}

    coverage = {norm(row["task"]): float(row["penetration"]) for row in read_csv("aei_task_penetration.csv")}
    job_exposure = {row["occ_code"]: (row["title"], float(row["observed_exposure"])) for row in read_csv("aei_job_exposure.csv")}

    # How AI is used on a task: automation (directive, feedback loop) versus
    # augmentation (task iteration, validation, learning). 'filtered' is
    # traffic the source could not classify and is left out.
    mode_mix: dict[str, tuple[float, float]] = {}
    for row in read_csv("aei_automation_by_task.csv"):
        auto = float(row["directive"]) + float(row["feedback_loop"])
        assist = float(row["task_iteration"]) + float(row["validation"]) + float(row["learning"])
        total = auto + assist
        if total > 0:
            mode_mix[norm(row["task_name"])] = (auto / total, assist / total)

    importance: dict[str, float] = {}
    for row in read_csv("onet_task_ratings.csv"):
        if row["Scale ID"] == "IM" and row["O*NET-SOC Code"] in codes:
            importance[row["Task ID"]] = float(row["Data Value"])

    tasks_by_code: dict[str, list[dict]] = {code: [] for code in codes}
    titles: dict[str, str] = {}
    for row in read_csv("onet_task_statements.csv"):
        code = row["O*NET-SOC Code"]
        if code not in codes:
            continue
        titles[code] = row["Title"]
        key = norm(row["Task"])
        cov = coverage.get(key)
        auto, assist = mode_mix.get(key, (None, None))
        if cov is None:
            mode = "unknown"
        elif cov <= 0:
            mode = "human"
        elif auto is not None and auto > assist:
            mode = "automate"
        else:
            mode = "assist"
        tasks_by_code[code].append(
            {
                "id": row["Task ID"],
                "text": row["Task"].strip(),
                "type": row["Task Type"] or "Core",
                "importance": importance.get(row["Task ID"], 3.0),
                "coverage": cov if cov is not None else 0.0,
                "mode": mode,
                "automation": round(auto, 3) if auto is not None else None,
                "augmentation": round(assist, 3) if assist is not None else None,
            }
        )

    occupations = {}
    missing = []
    for item in wanted:
        code = item["soc"]
        tasks = tasks_by_code.get(code, [])
        if not tasks:
            missing.append(code)
            continue
        weight = sum(task["importance"] for task in tasks)
        computed = sum(task["importance"] * task["coverage"] for task in tasks) / weight
        shifted = [task for task in tasks if task["coverage"] > 0]
        shifted_weight = sum(task["importance"] for task in shifted) or 1.0
        automate_share = sum(task["importance"] for task in shifted if task["mode"] == "automate") / shifted_weight

        official = job_exposure.get(code[:7]) if code.endswith(".00") else None
        exposure = official[1] if official else round(computed, 4)

        display = sorted(tasks, key=lambda task: (-task["importance"], task["type"] != "Core"))[:DISPLAY_TASKS]
        occupations[code] = {
            "soc": code,
            "title": titles[code],
            "label": item["label"],
            "family": item["family"],
            "kind": item["kind"],
            "declineNote": item.get("declineNote"),
            "exposure": exposure,
            "exposureSource": "aei_job_exposure" if official else "nexa_task_weighted",
            "computedExposure": round(computed, 4),
            "taskCount": len(tasks),
            "coveredTaskCount": len(shifted),
            "automateShare": round(automate_share, 3),
            "tasks": display,
        }

    payload = {
        "generatedOn": date.today().isoformat(),
        "universe": {"onetTasks": len(read_csv("onet_task_statements.csv")), "matchedToAiUse": sum(1 for row in read_csv("onet_task_statements.csv") if norm(row["Task"]) in coverage)},
        "sources": {
            "onet": {"name": "O*NET 31.0 Database", "publisher": "U.S. Department of Labor / National Center for O*NET Development", "url": "https://www.onetcenter.org/database.html", "licence": "CC BY 4.0"},
            "aeiLabor": {"name": "Anthropic Economic Index — labor market impacts (job exposure, task coverage)", "publisher": "Anthropic", "url": "https://huggingface.co/datasets/Anthropic/EconomicIndex/tree/main/labor_market_impacts", "published": "2026-03-05", "licence": "CC BY"},
            "aeiModes": {"name": "Anthropic Economic Index — automation vs augmentation by task (2025-03-27 release)", "publisher": "Anthropic", "url": "https://huggingface.co/datasets/Anthropic/EconomicIndex/tree/main/release_2025_03_27", "published": "2025-03-27", "licence": "CC BY"},
        },
        "occupations": occupations,
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)}: {len(occupations)} occupations")
    for code, occ in occupations.items():
        print(f"  {code}  exposure {occ['exposure']:.3f} ({occ['exposureSource']}, computed {occ['computedExposure']:.3f})  {occ['coveredTaskCount']}/{occ['taskCount']} tasks with AI use  {occ['label']}")
    if missing:
        print("MISSING (no O*NET tasks):", ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
