#!/usr/bin/env sh
# Download the public datasets Nexa is built from into data/raw/, then build
# data/occupation-tasks.json. Run from the project root: sh scripts/fetch_data.sh
set -e
mkdir -p data/raw
cd data/raw
AEI=https://huggingface.co/datasets/Anthropic/EconomicIndex/resolve/main
ONET=https://www.onetcenter.org/dl_files/database/db_31_0_csv
curl -fsSL -o aei_job_exposure.csv      "$AEI/labor_market_impacts/job_exposure.csv"
curl -fsSL -o aei_task_penetration.csv  "$AEI/labor_market_impacts/task_penetration.csv"
curl -fsSL -o aei_automation_by_task.csv "$AEI/release_2025_03_27/automation_vs_augmentation_by_task.csv"
curl -fsSL -o onet_task_statements.csv  "$ONET/task_statements.csv"
curl -fsSL -o onet_task_ratings.csv     "$ONET/task_ratings.csv"
curl -fsSL -o onet_occupation_data.csv  "$ONET/occupation_data.csv"
cd ../..
python3 -I scripts/build_data.py
