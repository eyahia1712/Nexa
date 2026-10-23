"""Check that every course and source URL in the curated catalogue resolves.

Writes data/link-check.json with the HTTP status of each URL and the date it
was checked, so the app can show "link verified on <date>" and the team knows
which entries to fix.

Run:  python3 -I scripts/check_links.py
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURATED = ROOT / "data" / "curated"
OUT = ROOT / "data" / "link-check.json"
AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"


def status(url: str) -> int:
    for method in ("HEAD", "GET"):
        request = urllib.request.Request(url, method=method, headers={"User-Agent": AGENT})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return response.status
        except urllib.error.HTTPError as error:
            # Many sites answer HEAD differently from a real page load; only
            # the GET result counts.
            if method == "GET":
                return error.code
        except Exception:
            if method == "GET":
                return 0
    return 0


def main() -> int:
    courses = json.loads((CURATED / "courses.json").read_text())["courses"]
    roles = json.loads((CURATED / "roles.json").read_text())["sources"]
    urls = {course["id"]: course["url"] for course in courses}
    urls.update({f"source:{key}": value["url"] for key, value in roles.items()})
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = dict(zip(urls, pool.map(status, urls.values())))
    payload = {"checkedOn": date.today().isoformat(), "results": {key: {"url": urls[key], "status": code} for key, code in results.items()}}
    OUT.write_text(json.dumps(payload, indent=1) + "\n")
    bad = {key: code for key, code in results.items() if not 200 <= code < 400}
    print(f"checked {len(results)} links, {len(results) - len(bad)} ok")
    for key, code in bad.items():
        print(f"  {code}  {key}  {urls[key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
