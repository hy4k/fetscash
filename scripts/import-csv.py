#!/usr/bin/env python3
"""Parse accounting CSV exports (Clients, Invoice, InvoiceItems, Products)
into src/data/imported.json for the FETS Accounts app."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-import"
OUT = ROOT / "src" / "data" / "imported.json"


def num(v: str) -> float:
    if v is None:
        return 0.0
    s = str(v).replace("₹", "").replace(",", "").strip()
    if s in ("", "-"):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def text(v: str) -> str:
    s = (v or "").strip()
    return "" if s == "-" else s


def parse_date(v: str) -> str:
    """DD-MM-YYYY (possibly padded) -> ISO YYYY-MM-DD, else ''."""
    s = (v or "").strip()
    m = re.match(r"(\d{1,2})-(\d{1,2})-(\d{4})", s)
    if not m:
        return ""
    d, mo, y = m.groups()
    return f"{y}-{int(mo):02d}-{int(d):02d}"


MONTH_LOOKUP = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def parse_date_long(v: str) -> str:
    """'12 Sep 2024' -> ISO YYYY-MM-DD, else ''."""
    s = (v or "").strip()
    m = re.match(r"(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})", s)
    if not m:
        return ""
    d, mon, y = m.groups()
    mo = MONTH_LOOKUP.get(mon.title())
    return f"{y}-{mo:02d}-{int(d):02d}" if mo else ""


def read_csv(name: str):
    with open(SRC / name, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


customers = []
for r in read_csv("Clients.csv"):
    name = text(r.get("Organization Name"))
    if not name:
        continue
    customers.append({
        "id": re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").lower()[:40],
        "name": name,
        "contact_person": text(r.get("Contact Person")),
        "email": text(r.get("Email")),
        "phone": text(r.get("Contact Number")),
        "address": (r.get("Address") or "").strip(),
        "tax_id": text(r.get("Tax ID")),
        "balance": num(r.get("Balance")),
        "total_invoices": int(num(r.get("Total Invoices"))),
        "unpaid_invoices": int(num(r.get("Unpaid Invoices"))),
    })

items = []
for r in read_csv("InvoiceItems.csv"):
    inv = text(r.get("Invoice No."))
    if not inv:
        continue
    items.append({
        "invoice_number": inv,
        "item": text(r.get("Add Item")),
        "qty": num(r.get("Qty")),
        "rate": num(r.get("Rate")),
        "amount": num(r.get("Amount")),
        "description": text(r.get("Description")),
    })

invoices = []
for r in read_csv("Invoice.csv"):
    number = text(r.get("Invoice No."))
    if not number:
        continue
    amount = num(r.get("Amount"))
    balance = num(r.get("Balance")) or amount
    invoices.append({
        "id": number,
        "invoice_number": number,
        "customer_name": text(r.get("Organization Name")) or text(r.get("Client Name")),
        "client_label": text(r.get("Client Name")),
        "reference": text(r.get("Reference")),
        "invoice_date": parse_date(r.get("Created Date")),
        "due_date": parse_date(r.get("Due Date")),
        "total_amount": amount,
        "balance": balance,
        "paid_amount": round(amount - balance, 2),
        "status": "paid" if balance <= 0 else "sent",
        "items": [i for i in items if i["invoice_number"].lower() == number.lower()],
    })

products = []
for r in read_csv("Products.csv"):
    name = text(r.get("Product Name"))
    if not name:
        continue
    products.append({
        "id": re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").lower()[:40],
        "name": name,
        "hsn": text(r.get("HSN Code")),
        "buy_rate": num(r.get("Buy Rate")),
        "sale_rate": num(r.get("Sale Rate")),
        "description": text(r.get("Description")),
        "tax_list": text(r.get("Tax List")),
    })

expenses = []
xlsx_path = SRC / "Detailed-Expense-Report.xlsx"
if xlsx_path.exists():
    import openpyxl

    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb.active
    for row in ws.iter_rows(values_only=True, min_row=5):
        a, b, c, d, e = (list(row) + [None] * 5)[:5]
        b_s = str(b or "").strip()
        c_s = str(c or "").strip()
        d_s = str(d or "").strip()
        # Detail rows carry their own date in col B; group-header / total rows don't.
        if not b_s or not c_s or d_s.lower() == "total":
            continue
        iso = parse_date_long(b_s)
        if not iso:
            continue
        expenses.append({
            "id": str(a or f"EXP{len(expenses) + 1}").strip(),
            "date": iso,
            "category": c_s.title(),
            "type": d_s or "DIRECT",
            "amount": num(str(e)),
            "description": c_s.title(),
        })

payload = {
    "source": "csv-import",
    "customers": customers,
    "invoices": invoices,
    "products": products,
    "expenses": expenses,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"customers={len(customers)} invoices={len(invoices)} items={len(items)} products={len(products)} expenses={len(expenses)}")
print(f"wrote {OUT}")
