#!/usr/bin/env python3
"""Seed the FETS Accounts Supabase backend (acc_* tables) from src/data/imported.json.

Run AFTER supabase-setup.sql has been executed in the project's SQL editor:
  python scripts/seed-supabase.py
Uses the anon key from ../.env (read-only usage here is the key the owner supplied).
Idempotent: skips seeding if acc_invoices already has rows unless --force is passed.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://fcuxncgafmtfmagtzouh.supabase.co/rest/v1"


def load_key():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("VITE_SUPABASE_ANON_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("VITE_SUPABASE_ANON_KEY not found in .env")


KEY = load_key()
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=merge-duplicates",
}


def post(table, rows, batch=200):
    done = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        req = urllib.request.Request(
            f"{BASE}/{table}", data=json.dumps(chunk).encode(),
            headers=HEADERS, method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:500]
            sys.exit(f"POST {table} batch {i // batch + 1} failed: {e.code} {body}")
        done += len(chunk)
        print(f"  {table}: {done}/{len(rows)}")


def count(table):
    req = urllib.request.Request(
        f"{BASE}/{table}?select=id",
        headers={**HEADERS, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"},
        method="HEAD",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        cr = resp.headers.get("Content-Range", "*/0")
        return int(cr.split("/")[-1])


def main():
    force = "--force" in sys.argv
    data = json.loads((ROOT / "src" / "data" / "imported.json").read_text(encoding="utf-8"))

    existing = count("acc_invoices")
    if existing and not force:
        print(f"acc_invoices already has {existing} rows — pass --force to seed anyway")
        return

    print("Seeding customers…")
    post("acc_customers", [{
        "id": c["id"], "name": c["name"],
        "contact_person": c.get("contact_person") or None,
        "email": c.get("email") or None,
        "phone": c.get("phone") or None,
        "address": c.get("address") or None,
        "tax_id": c.get("tax_id") or None,
        "balance": c.get("balance") or 0,
        "total_invoices": c.get("total_invoices") or 0,
        "unpaid_invoices": c.get("unpaid_invoices") or 0,
    } for c in data["customers"]])

    print("Seeding products…")
    post("acc_products", [{
        "id": p["id"], "name": p["name"],
        "hsn": p.get("hsn") or None,
        "buy_rate": p.get("buy_rate") or 0,
        "sale_rate": p.get("sale_rate") or 0,
        "description": p.get("description") or None,
        "tax_list": p.get("tax_list") or None,
    } for p in data["products"]])

    print("Seeding invoices…")
    post("acc_invoices", [{
        "id": i["id"], "invoice_number": i["invoice_number"],
        "customer_name": i.get("customer_name") or i.get("client_label") or None,
        "client_label": i.get("client_label") or None,
        "reference": i.get("reference") or None,
        "invoice_date": i.get("invoice_date") or None,
        "due_date": i.get("due_date") or None,
        "currency": "INR",
        "total_amount": i.get("total_amount") or 0,
        "balance": i.get("balance") or 0,
        "paid_amount": i.get("paid_amount") or 0,
        "status": i.get("status") or "sent",
        "items": i.get("items") or None,
        "exchange_rate": i.get("exchange_rate"),
        "original_amount": i.get("original_amount"),
        "original_currency": i.get("original_currency"),
        "payment_date": i.get("payment_date") or None,
    } for i in data["invoices"]])

    print("Seeding payments…")
    post("acc_payments", [{
        "id": p["id"], "invoice_id": p.get("invoice_id") or None,
        "payment_date": p.get("payment_date") or None,
        "amount": p.get("amount") or 0,
        "amount_inr": p.get("amount_inr") or p.get("amount") or 0,
        "payment_method": p.get("payment_method") or None,
        "reference_number": p.get("reference_number") or None,
        "exchange_rate": p.get("exchange_rate"),
    } for p in data["payments"]])

    print("Seeding expenses…")
    post("acc_expenses", [{
        "id": e["id"], "date": e.get("date") or None,
        "category": e.get("category") or "General",
        "type": e.get("type") or None,
        "amount": e.get("amount") or 0,
        "description": e.get("description") or None,
    } for e in data["expenses"]])

    # ---- verification ----
    print("\nVerifying…")
    checks = {
        "acc_customers": len(data["customers"]),
        "acc_products": len(data["products"]),
        "acc_invoices": len(data["invoices"]),
        "acc_payments": len(data["payments"]),
        "acc_expenses": len(data["expenses"]),
    }
    ok = True
    for table, want in checks.items():
        got = count(table)
        mark = "OK" if got >= want else "MISMATCH"
        if got < want:
            ok = False
        print(f"  {table}: {got} rows (expected {want}) {mark}")
    exp_income = sum(p.get("amount_inr") or p.get("amount") or 0 for p in data["payments"])
    exp_expense = sum(e.get("amount") or 0 for e in data["expenses"])
    print(f"\nExpected totals — income ₹{exp_income:,.0f}, expenses ₹{exp_expense:,.0f}")
    print("SEED COMPLETE" if ok else "SEED INCOMPLETE — check mismatches above")


if __name__ == "__main__":
    main()
