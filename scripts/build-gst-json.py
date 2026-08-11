#!/usr/bin/env python3
"""Consolidate scraped GST portal data into fets-accounts/src/data/gst.json.

Sources (raw WebBridge captures in workspace root):
  gst-complete.json  - GSTR-3B 2025-26/2024-25 (+ GSTR-9/9C absence)
  gst-g1.json        - GSTR-1  2025-26/2024-25
  gst-fy27.json      - GSTR-1 + GSTR-3B 2026-27 (Apr/May/Jun)
Ledger + turnover figures verified live 2026-08-10 via portal APIs.
"""
import json
from datetime import date
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
WS = APP.parent  # workspace root holds the raw captures
OUT = APP / "src" / "data" / "gst.json"

MONTHS = ["April", "May", "June", "July", "August", "September",
          "October", "November", "December", "January", "February", "March"]
MNUM = {m: (i + 4 if i < 9 else i - 8) for i, m in enumerate(MONTHS)}  # April=4 ... March=3


def load_capture(name):
    d = json.load(open(WS / name, encoding="utf-8"))
    return json.loads(d["data"]["value"])


def period_date(fy, month):
    """Calendar date of the 1st of a tax period month inside an FY like 2025-26."""
    y0 = int(fy[:4])
    mn = MNUM[month]
    yr = y0 if mn >= 4 else y0 + 1
    return date(yr, mn, 1)


def due_date(fy, month, rtn):
    """GSTR-1 due 11th of next month; GSTR-3B due 20th of next month."""
    p = period_date(fy, month)
    yr, mn = (p.year + 1, 1) if p.month == 12 else (p.year, p.month + 1)
    return date(yr, mn, 11 if rtn == "GSTR-1" else 20)


def parse_dof(s):  # '09/07/2026'
    d, m, y = s.split("/")
    return date(int(y), int(m), int(d))


filings = []
complete = load_capture("gst-complete.json")
g1 = load_capture("gst-g1.json")
fy27 = load_capture("gst-fy27.json")

# GSTR-3B rows from gst-complete.json
for fy in ("2025-26", "2024-25"):
    for r in complete[fy]["gstr3b"]:
        filings.append({"fy": fy, "period": r["taxp"], "return": "GSTR-3B",
                        "arn": r["arn"], "filed_on": r["dof"], "mode": r["mof"],
                        "filed_by": r["filedBy"]})
# GSTR-1 rows
for fy in ("2025-26", "2024-25"):
    for r in g1[fy]:
        filings.append({"fy": fy, "period": r["taxp"], "return": "GSTR-1",
                        "arn": r["arn"], "filed_on": r["dof"], "mode": r["mof"],
                        "filed_by": r["filedBy"]})
# FY 2026-27
for r in fy27["gstr1"]:
    filings.append({"fy": "2026-27", "period": r["taxp"], "return": "GSTR-1",
                    "arn": r["arn"], "filed_on": r["dof"], "mode": r["mof"],
                    "filed_by": r["filedBy"]})
for r in fy27["gstr3b"]:
    filings.append({"fy": "2026-27", "period": r["taxp"], "return": "GSTR-3B",
                    "arn": r["arn"], "filed_on": r["dof"], "mode": r["mof"],
                    "filed_by": r["filedBy"]})

# Normalise + due/late computation
for f in filings:
    d = parse_dof(f["filed_on"])
    due = due_date(f["fy"], f["period"], f["return"])
    f["filed_on"] = d.isoformat()
    f["due_date"] = due.isoformat()
    f["days_late"] = max(0, (d - due).days)

TODAY = date(2026, 8, 10)

# Period grid: Sep-2024 .. Jul-2026 (registration live since Sep 2024)
periods = []
for fy, months in (("2024-25", MONTHS[5:]), ("2025-26", MONTHS), ("2026-27", MONTHS[:4])):
    for m in months:
        p = period_date(fy, m)
        row = {"fy": fy, "period": m, "period_start": p.isoformat()}
        for rtn in ("GSTR-1", "GSTR-3B"):
            hit = next((f for f in filings if f["fy"] == fy and f["period"] == m and f["return"] == rtn), None)
            due = due_date(fy, m, rtn)
            key = "gstr1" if rtn == "GSTR-1" else "gstr3b"
            if hit:
                row[key] = {"status": "filed_late" if hit["days_late"] else "filed",
                            "arn": hit["arn"], "filed_on": hit["filed_on"],
                            "due_date": hit["due_date"], "days_late": hit["days_late"]}
            else:
                row[key] = {"status": "overdue" if TODAY > due else "pending",
                            "due_date": due.isoformat(),
                            "days_overdue": max(0, (TODAY - due).days)}
        periods.append(row)

doc = {
    "gstin": "32AAIFF5955B1ZO",
    "legal_name": "Forun Testing And Educational Services",
    "filing_frequency": "Monthly",
    "registered_since": "2024-09",
    "scraped_at": "2026-08-10",
    "itc_balance": {"igst": 11908, "cgst": 123604, "sgst": 144125, "cess": 87,
                    "total": 279724, "as_of": "2026-08-10"},
    "cash_ledger_balance": 0,
    "open_liabilities": 0,
    "turnover": [
        {"fy": "2024-25", "system_calculated": 1243794, "estimated": 1741311.60},
        {"fy": "2025-26", "system_calculated": 5588373.50, "estimated": None},
        {"fy": "2026-27", "system_calculated": 0, "estimated": None},
    ],
    "annual_returns": [
        {"fy": "2024-25", "gstr9": "not_filed", "gstr9c": "not_filed",
         "note": "Optional - aggregate turnover below Rs 2 crore"},
        {"fy": "2025-26", "gstr9": "not_due", "gstr9c": "not_due",
         "note": "Due 31-12-2026; expected optional - turnover below Rs 2 crore"},
    ],
    "periods": periods,
    "filings": sorted(filings, key=lambda f: (f["filed_on"], f["return"])),
}

OUT.write_text(json.dumps(doc, indent=2), encoding="utf-8")
late1 = sum(1 for f in filings if f["return"] == "GSTR-1" and f["days_late"])
late3 = sum(1 for f in filings if f["return"] == "GSTR-3B" and f["days_late"])
print(f"wrote {OUT}")
print(f"filings: {len(filings)}  (GSTR-1 late: {late1}, GSTR-3B late: {late3})")
print("pending/overdue periods:")
for p in periods:
    for k in ("gstr1", "gstr3b"):
        if p[k]["status"] != "filed":
            print(" ", p["fy"], p["period"], k, p[k]["status"], p[k].get("due_date"))
