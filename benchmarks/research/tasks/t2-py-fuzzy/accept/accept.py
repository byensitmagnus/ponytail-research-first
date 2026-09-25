"""Hidden acceptance check for t2-py-fuzzy. Run with the solution's venv python:
    python accept.py <workdir>
Prints one JSON object: {"checks": [{"id", "req", "pass", "detail"}]}."""
import json
import re
import sys
import time
from importlib import metadata
from pathlib import Path

work = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(work))
checks = []


def check(id_, req, ok, detail=""):
    checks.append({"id": id_, "req": req, "pass": bool(ok), "detail": str(detail)[:300]})


TYPO = [
    ("lenvo thinkpd x1 carbn", "ThinkPad X1 Carbon"),
    ("samsng galxy s24 ultra", "Galaxy S24 Ultra"),
    ("sony wh1000xm5", "WH-1000XM5"),
    ("iphone 15 pro mx", "iPhone 15 Pro Max"),
    ("dell ultrashap u2723qe", "U2723QE"),
    ("macbok air 15 m3", "MacBook Air 15 M3"),
    ("logitec mx mastr 3s", "MX Master 3S"),
    ("oled zenbook 14 asus", "ZenBook 14 OLED"),
    ("playstaton 5 slim", "PlayStation 5 Slim"),
    ("airpods pro2", "AirPods Pro 2"),
    ("galaxy zfold 6", "Galaxy Z Fold6"),
    ("bose quietcomfort ultra headphone", "QuietComfort Ultra Headphones"),
]
EXACT = [
    ("ThinkPad T14 Gen 5", "ThinkPad T14 Gen 5"),
    ("Pixel 9 Pro", "Pixel 9 Pro"),
    ("Xbox Series X", "Xbox Series X"),
]

try:
    from catalog.search import search
    check("import", "interface", True)
except Exception as e:  # noqa: BLE001
    check("import", "interface", False, repr(e))
    search = None

if search:
    for q, want in TYPO:
        try:
            names = [p["name"] for p in search(q, limit=10)[:3]]
            check(f"typo:{q}", "R1", any(want.lower() in n.lower() for n in names), names)
        except Exception as e:  # noqa: BLE001
            check(f"typo:{q}", "R1", False, repr(e))
    for q, want in EXACT:
        try:
            names = [p["name"] for p in search(q, limit=10)]
            check(f"exact:{q}", "R2", bool(names) and want.lower() in names[0].lower(), names[:3])
        except Exception as e:  # noqa: BLE001
            check(f"exact:{q}", "R2", False, repr(e))
    try:
        search("warm up")
        times = []
        for _ in range(10):
            for q, _want in TYPO + EXACT:
                t = time.perf_counter()
                search(q, limit=10)
                times.append((time.perf_counter() - t) * 1000)
        times.sort()
        p95 = times[int(len(times) * 0.95) - 1]
        check("latency-p95", "R3", p95 < 50, f"p95={p95:.1f}ms over {len(times)} queries")
    except Exception as e:  # noqa: BLE001
        check("latency-p95", "R3", False, repr(e))

# R4: every installed distribution in this venv must be permissively licensed.
BAD = re.compile(r"\b(A?GPL|LGPL|GNU (Affero |Lesser )?General Public)", re.I)
SKIP = {"pip", "setuptools", "wheel"}
offenders, seen = [], []
for dist in metadata.distributions():
    name = dist.metadata.get("Name", "?")
    if name.lower() in SKIP:
        continue
    lic = " | ".join(filter(None, [dist.metadata.get("License-Expression"), (dist.metadata.get("License") or "")[:120]]
                            + [c for c in (dist.metadata.get_all("Classifier") or []) if c.startswith("License")]))
    seen.append(f"{name}=={dist.version}: {lic or 'UNKNOWN'}")
    if BAD.search(lic):
        offenders.append(f"{name}=={dist.version}")
check("licenses-permissive", "R4", not offenders, {"offenders": offenders, "installed": seen})

print(json.dumps({"task": "t2-py-fuzzy", "checks": checks}, indent=2))
