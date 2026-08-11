# Reconcile Federal Bank statements with invoices + import bank expenses.
# Reads:  data-import/{2022.xls,2023.xls,2024.xlsx,2025.xlsx,2026 august 09.xlsx}
#         src/data/imported.json  (produced by import-csv.py)
# Writes: src/data/imported.json  (adds payments[], bank expenses[], FX invoice updates)
# Idempotent: drops previously generated 'bk-*' expenses and all payments, rebuilds.

import json
import re
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data-import'
JSON_PATH = ROOT / 'src' / 'data' / 'imported.json'

STATEMENTS = ['2022.xls', '2023.xls', '2024.xlsx', '2025.xlsx', '2026 august 09.xlsx']

# Existing expense report (Detailed-Expense-Report.xlsx) covers this window —
# only import bank debits OUTSIDE it to avoid double counting.
EXP_WINDOW_START = date(2024, 9, 12)
EXP_WINDOW_END = date(2025, 11, 28)

# Self / partner / related-entity flows — never income, never expense
SELF_NAMES = re.compile(r'MITHUN|NIYAS|FORUN|MB FTB|MEDIOS|ENNENS', re.I)
# Capital injections into the account (credits only) — not business income
CAPITAL_IN = re.compile(r'HIMA SUMAL|RAHUL|TINTO THOMAS|SYAMILY|ALEEFA', re.I)
# FN transfers whose beneficiary is itself a bank (own accounts / card payments)
BANK_TRANSFER_BEN = {'CANARA', 'AXIS BANK', 'UNION BANK', 'SOUTH INDI', 'SBI'}
# Foreign remittance markers in credit particulars
FX_MARKERS = re.compile(r'1316FRT|GLOBAL REMITTAN|CITI', re.I)
FOREIGN_CLIENTS = re.compile(r'PARAGON|PROMETRIC|ETS DIGITAL', re.I)
# 2% TDS on GST-exclusive base => credit = invoice * 0.9830508 (ETS India, Planet EDU, Elance pattern)
TDS_FACTOR = 1 - (0.02 / 1.18)


def parse_date(s):
    s = str(s).strip()
    m = re.match(r'(\d{2})[-/](\d{2})[-/](\d{4})', s)
    if m:
        d, mo, y = (int(x) for x in m.groups())
        return date(y, mo, d)
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        y, mo, d = (int(x) for x in m.groups())
        return date(y, mo, d)
    return None


def num(x):
    try:
        s = str(x).replace(',', '').strip()
        if s in ('', 'nan', 'NaN', '-', 'None'):
            return 0.0
        return float(s)
    except ValueError:
        return 0.0


def load_bank_rows():
    rows = []
    for f in STATEMENTS:
        path = DATA / f
        if f.endswith('.xls'):
            df = pd.read_excel(path, header=None, engine='xlrd')
            hdr = None
            for i in range(min(30, len(df))):
                if any('Particulars' in str(x) for x in df.iloc[i].tolist()):
                    hdr = i
                    break
            body = df.iloc[hdr + 1:]
            for v in body.values.tolist():
                rows.append((v[1], v[2], v[7], v[8]))
        else:
            df = pd.read_excel(path, header=None)
            for v in df.values.tolist():
                if str(v[0]).strip().lower() in ('date', 'txn date'):
                    continue
                rows.append((v[0], v[2], v[7], v[8]))

    credits, debits = [], []
    for d_raw, p_raw, w_raw, dep_raw in rows:
        p = str(p_raw).strip()
        if 'GRAND TOTAL' in p.upper() or p.upper().startswith('TOTAL'):
            continue
        d = parse_date(d_raw)
        if not d:
            continue
        w, dep = num(w_raw), num(dep_raw)
        if dep > 0:
            credits.append({'date': d, 'particulars': p, 'amount': dep})
        elif w > 0:
            debits.append({'date': d, 'particulars': p, 'amount': w})
    return credits, debits


def days_between(a, b):
    return (a - b).days


def match_invoices(invoices, credits):
    used = set()
    payments = []
    report = {'inr': [], 'fx': [], 'tds': [], 'unpaid': []}

    def candidates(inv_date, max_after, min_before=5):
        lo, hi = inv_date - timedelta(days=min_before), inv_date + timedelta(days=max_after)
        return [(i, c) for i, c in enumerate(credits)
                if i not in used and lo <= c['date'] <= hi]

    ordered = sorted(invoices, key=lambda i: i['invoice_date'])
    for inv in ordered:
        if inv.get('status') == 'paid':
            continue  # already reconciled (e.g. rerun on mutated file)
        inv_date = date.fromisoformat(inv['invoice_date'])
        total = float(inv['total_amount'])
        cname = inv.get('customer_name') or inv.get('client_label') or ''
        is_ets_india = 'ETS INDIA' in cname.upper()
        is_foreign = bool(FOREIGN_CLIENTS.search(cname))
        match = None
        kind = None

        # Rule C first for ETS India (TDS-deducted NEFT credits from ETS INDIA)
        if is_ets_india:
            for idx, c in candidates(inv_date, 120):
                if 'ETS INDIA' not in c['particulars'].upper():
                    continue
                delta_tds = abs(c['amount'] - total * TDS_FACTOR)
                delta_full = abs(c['amount'] - total)
                if delta_tds <= 5 or delta_full <= 5 or delta_full / total <= 0.03:
                    match, kind = (idx, c), 'tds'
                    break

        # Rule A: exact INR
        if not match:
            best = None
            for idx, c in candidates(inv_date, 180):
                delta = abs(c['amount'] - total)
                if delta <= 1.0:
                    if best is None or c['date'] < best[1]['date']:
                        best = (idx, c)
            if best:
                match, kind = best, 'inr'

        # Rule C2: TDS-deducted credit for any client (distinctive 0.9830508 factor).
        # Floor of ₹500 avoids tiny-amount coincidences (e.g. ₹2 verification credits).
        if not match and total >= 500:
            tol = max(5.0, total * 0.001)
            best = None
            for idx, c in candidates(inv_date, 120):
                if abs(c['amount'] - total * TDS_FACTOR) <= tol:
                    if best is None or c['date'] < best[1]['date']:
                        best = (idx, c)
            if best:
                match, kind = best, 'tds'

        # Rule B: FX conversion (foreign remittance markers only, earliest plausible)
        if not match and is_foreign and total <= 100000:
            best = None
            for idx, c in candidates(inv_date, 120):
                if not FX_MARKERS.search(c['particulars']):
                    continue
                rate = c['amount'] / total
                if 50 <= rate <= 100:
                    if best is None or c['date'] < best[1]['date']:
                        best = (idx, c)
            if best:
                match, kind = best, 'fx'

        if not match:
            report['unpaid'].append((inv['invoice_number'], inv_date.isoformat(), total, cname))
            continue

        used.add(match[0])
        credit = match[1]
        rate = round(credit['amount'] / total, 4)
        pay = {
            'id': f"pay-bank-{len(payments) + 1:03d}",
            'invoice_id': inv['id'],
            'payment_date': credit['date'].isoformat(),
            'amount': total if kind == 'fx' else credit['amount'],
            'amount_inr': credit['amount'],
            'payment_method': 'Wire' if FX_MARKERS.search(credit['particulars']) else 'Bank Transfer',
            'reference_number': credit['particulars'][:80],
        }
        if kind == 'fx':
            pay['exchange_rate'] = rate
        payments.append(pay)

        # Update invoice: total_amount becomes INR equivalent for the books
        inv['paid_amount'] = credit['amount']
        inv['status'] = 'paid'
        inv['balance'] = 0
        inv['payment_date'] = credit['date'].isoformat()
        if kind == 'fx':
            inv['original_amount'] = total
            inv['original_currency'] = 'USD'
            inv['exchange_rate'] = rate
            inv['total_amount'] = credit['amount']
        report[kind].append((inv['invoice_number'], cname[:28], total,
                             credit['amount'], credit['date'].isoformat(),
                             rate if kind in ('fx', 'tds') else None,
                             credit['particulars'][:45]))
    return payments, report, used


# Owner-confirmed payment facts that the automatic rules cannot see:
# - B-11: paid by Prometric remittance received 19-09-2024 (₹205,326, 1316FRT17375424),
#   40 days BEFORE the invoice date — outside the auto-match window.
MANUAL_CREDIT_MATCH = {
    'B-11': {'date': date(2024, 9, 19), 'amount': 205326.0},
}

# Owner confirmed (09-08-2026) these are paid in full, but no matching credit exists
# in the Federal statements provided. rate = estimate from the client's most recent remittance.
OWNER_CONFIRMED_PAID = {
    'CEL-04': {'payment_date': '2026-08-09', 'est_rate': 93.60},  # $222, statement ends 09-08-2026
    'A-11': {'payment_date': '2025-01-29', 'est_rate': None},     # ₹1,180 INR invoice
    'PSI-01': {'payment_date': '2025-04-02', 'est_rate': 81.39},  # $7
}


def apply_manual_matches(invoices, credits, used, payments, report):
    """B-11 style matches: exact credit identified by hand."""
    for inv in invoices:
        num = inv['invoice_number'].strip()
        if num not in MANUAL_CREDIT_MATCH or inv.get('status') == 'paid':
            continue
        spec = MANUAL_CREDIT_MATCH[num]
        hit = next(((i, c) for i, c in enumerate(credits)
                    if i not in used and c['date'] == spec['date']
                    and abs(c['amount'] - spec['amount']) <= 1), None)
        if not hit:
            report.setdefault('manual_missing', []).append(num)
            continue
        idx, credit = hit
        used.add(idx)
        total = float(inv['total_amount'])
        rate = round(credit['amount'] / total, 4)
        inv['paid_amount'] = credit['amount']
        inv['status'] = 'paid'
        inv['balance'] = 0
        inv['payment_date'] = credit['date'].isoformat()
        inv['original_amount'] = total
        inv['original_currency'] = 'USD'
        inv['exchange_rate'] = rate
        inv['total_amount'] = credit['amount']
        payments.append({
            'id': f"pay-bank-{len(payments) + 1:03d}",
            'invoice_id': inv['id'],
            'payment_date': credit['date'].isoformat(),
            'amount': total,
            'amount_inr': credit['amount'],
            'payment_method': 'Wire',
            'reference_number': credit['particulars'][:80],
            'exchange_rate': rate,
        })
        report['fx'].append((num, (inv.get('customer_name') or '')[:28], total,
                             credit['amount'], credit['date'].isoformat(), rate,
                             credit['particulars'][:45]))


def apply_owner_confirmed(invoices, payments, report):
    """Mark owner-confirmed paid invoices; receipt not visible in the bank statement."""
    for inv in invoices:
        num = inv['invoice_number'].strip()
        if num not in OWNER_CONFIRMED_PAID or inv.get('status') == 'paid':
            continue
        spec = OWNER_CONFIRMED_PAID[num]
        total = float(inv['total_amount'])
        rate = spec['est_rate']
        amount_inr = round(total * rate, 0) if rate else total
        note = 'Owner-confirmed paid; receipt not in Federal statement'
        inv['paid_amount'] = amount_inr
        inv['status'] = 'paid'
        inv['balance'] = 0
        inv['payment_date'] = spec['payment_date']
        if rate:
            inv['original_amount'] = total
            inv['original_currency'] = 'USD'
            inv['exchange_rate'] = rate
            inv['total_amount'] = amount_inr
        payments.append({
            'id': f"pay-bank-{len(payments) + 1:03d}",
            'invoice_id': inv['id'],
            'payment_date': spec['payment_date'],
            'amount': total,
            'amount_inr': amount_inr,
            'payment_method': 'Owner confirmed',
            'reference_number': note + (' (est. rate)' if rate else ''),
            'exchange_rate': rate,
        })
        report.setdefault('owner_confirmed', []).append(
            (num, total, amount_inr, spec['payment_date'], note))


PRELEDGER_CUTOFF = date(2024, 10, 1)
PRELEDGER_CLIENTS = [
    # (marker in particulars, invoice prefix, customer name)
    ('1316FRT', 'PRO', 'PROMETRIC B.V'),
    ('GLOBAL REMITTAN', 'PEA', 'NCS PEARSON INCORPORATED'),
]


def backfill_preledger_invoices(data, credits, used, payments, report):
    """Pre-Oct-2024 business receipts have no invoice records. Create one invoice per
    receipt: PRO-xx (Prometric 1316FRT remittances), PEA-xx (Pearson CITI remittances)."""
    created = []
    for marker, prefix, cname in PRELEDGER_CLIENTS:
        seq = 0
        for i, c in enumerate(credits):
            if i in used or c['date'] >= PRELEDGER_CUTOFF:
                continue
            if SELF_NAMES.search(c['particulars']) or CAPITAL_IN.search(c['particulars']):
                continue
            if marker not in c['particulars'].upper():
                continue
            seq += 1
            used.add(i)
            num = f'{prefix}-{seq:02d}'
            amt = round(c['amount'], 2)
            inv = {
                'id': num,
                'invoice_number': num,
                'customer_name': cname,
                'client_label': cname,
                'reference': '',
                'invoice_date': c['date'].isoformat(),
                'due_date': '',
                'total_amount': amt,
                'balance': 0,
                'paid_amount': amt,
                'status': 'paid',
                'payment_date': c['date'].isoformat(),
                'items': [{
                    'invoice_number': num,
                    'item': 'Testing Services',
                    'qty': 1.0,
                    'rate': amt,
                    'amount': amt,
                    'description': 'Services/commission — backfilled from bank remittance',
                }],
            }
            data['invoices'].append(inv)
            payments.append({
                'id': f"pay-bank-{len(payments) + 1:03d}",
                'invoice_id': num,
                'payment_date': c['date'].isoformat(),
                'amount': amt,
                'amount_inr': amt,
                'payment_method': 'Wire',
                'reference_number': c['particulars'][:80],
            })
            created.append((num, cname[:28], amt, c['date'].isoformat(), c['particulars'][:45]))
    report['backfilled'] = created


CARD_RULES = [
    (r'AIRTEL|JIO|VODAFONE|BSNL|RECHARGE|BROADBAND', 'Utilities'),
    (r'GOOGLE|MICROSOFT|ADOBE|AMAZON WEB|AWS|OPENAI|GITHUB|ZOOM|CANVA|HOSTINGER|GODADDY|DIGITALOCEAN', 'Software & Subscriptions'),
    (r'PETROL|HINDUSTAN PET|INDIAN OIL|BPCL|IOCL|FUEL|HP PAY', 'Fuel'),
    (r'IRCTC|AIRLINE|INDIGO|AIR INDIA|MAKEMYTRIP|HOTEL|UBER|OLA CABS|REDBUS', 'Travel'),
    (r'SWIGGY|ZOMATO|RESTAURANT|BAKERY|CAFE|FOOD', 'Meals & Entertainment'),
    (r'AMAZON|FLIPKART|DMART|BLINKIT|RELIANCE SMART|MORE RETAIL', 'Office Supplies'),
    (r'CA PAYMENT|CA CHARGE|FILING FEE', 'Professional Fees'),
    (r'\bUPS\b|SYSTEM PUR', 'Equipment'),
]


def vendor_of(p):
    parts = [s.strip() for s in p.split('/')]
    up = p.upper()
    if up.startswith(('NFT', 'RTG')) and len(parts) >= 2:
        return parts[1]  # NFT/<name>/<utr>/<bank>
    if up.startswith('FN'):
        # FN/<name>/<ref> or FN IMPS/IFO/<ref>/<ifsc>/<narration>
        if len(parts) >= 2 and parts[1].upper() in ('IFO', 'IFI', 'IMPS', 'SHP'):
            return parts[-1]
        return parts[1] if len(parts) >= 2 else parts[0]
    return parts[-1]


def categorize_debit(p):
    up = p.upper()
    parts = p.split('/')
    ben = vendor_of(p)
    if up.startswith(('CHRG', 'SGST', 'CGST')) or 'MIN BAL' in up or up.startswith('CHARGES FOR') or 'CIBIL' in up:
        return 'Bank Charges', 'Federal Bank', 'Bank Charge'
    if 'CCTV' in up:
        return 'Equipment', ben[:40], 'Bank Transfer'
    if re.search(r'RENT|CALICUT FLAT', up):
        return 'Rent', ben[:40], 'Bank Transfer'
    if re.search(r'\bSAL\b|SALARY', up):
        return 'Salaries', ben[:40], 'Bank Transfer'
    if ben.lower() == 'cc':
        return 'Credit Card Payment', 'Credit Card', 'Bank Transfer'
    if up.startswith('TO ATM'):
        return 'Cash Withdrawal', 'ATM', 'Cash'
    keyword_hit = next((cat for rx, cat in CARD_RULES if re.search(rx, up)), None)
    if keyword_hit:
        method = 'Card' if up.startswith(('POS', 'TO ECM', 'TO INTL')) else 'Bank Transfer'
        return keyword_hit, ben[:40], method
    if up.startswith(('POS', 'TO ECM', 'TO INTL')):
        merchant = ' '.join(parts[1:])[:40] if len(parts) > 1 else p[:40]
        return 'Card Expenses', merchant, 'Card'
    return 'General', ben[:40], 'Bank Transfer'


def beneficiary_of(p):
    """Best-effort counterparty name from transfer particulars."""
    parts = [s.strip() for s in p.split('/')]
    up = p.upper()
    if up.startswith(('NFT', 'RTG')) and len(parts) >= 2:
        return parts[1]  # NFT/<name>/<utr>/<bank>
    if up.startswith('FN'):
        return parts[1] if len(parts) >= 2 else parts[0]
    return parts[-1]


# Owner-identified person payments (were excluded as "person transfer — review")
PERSON_RULES = [
    (r'MARIYAM', 'Rent', 'Mariyam — Calicut centre rent'),
    (r'BASIL BASHEER', 'Interior Works', 'Basil Basheer — Calicut centre interior works'),
    (r'Q TECH', 'Rent', 'Q TECH — Calicut centre rent/profit share (pre-Mariyam)'),
]
# Borrowed money returned — a loan repayment, not an expense
LOAN_FLOWS = re.compile(r'/JOHNSON/', re.I)


def import_bank_expenses(debits, existing_expenses):
    added, excluded = [], []
    for t in debits:
        d = t['date']
        if EXP_WINDOW_START <= d <= EXP_WINDOW_END:
            continue  # already covered by Detailed-Expense-Report.xlsx
        p = t['particulars']
        up = p.upper()
        if SELF_NAMES.search(p):
            excluded.append((d.isoformat(), t['amount'], 'self/partner/related transfer', p[:50]))
            continue
        if LOAN_FLOWS.search(p):
            excluded.append((d.isoformat(), t['amount'], 'loan repayment — not an expense', p[:50]))
            continue
        person = next((r for rx, *r in PERSON_RULES if re.search(rx, up)), None)
        if person:
            cat, desc = person
            added.append({
                'id': f'bk-{len(added) + 1:04d}',
                'date': d.isoformat(),
                'category': cat,
                'type': 'expense',
                'amount': round(t['amount'], 2),
                'description': f'{desc} — {p[:55]}',
            })
            continue
        ben = beneficiary_of(p)
        if up.startswith('FN') and ben.upper() in BANK_TRANSFER_BEN:
            excluded.append((d.isoformat(), t['amount'], 'own-account/card transfer', p[:50]))
            continue
        # Merchant-keyword check before numeric-reference exclusion
        # (e.g. FN/SHP/.../BHARTI AIRTEL LIMITED_PAYU ends in a numeric ref)
        keyword_hit = next((cat for rx, cat in CARD_RULES if re.search(rx, up)), None)
        # FN transfers ending in a numeric reference are person-to-person transfers
        # of unknown purpose (MARIYAM, BASIL, ALPHONSA, AYSHA...) — exclude, flagged for review.
        last_seg = p.split('/')[-1].strip()
        if up.startswith('FN') and re.fullmatch(r'[\d,]+', last_seg) and not keyword_hit:
            excluded.append((d.isoformat(), t['amount'], 'person transfer — review', p[:50]))
            continue
        cat, vendor, method = categorize_debit(p)
        added.append({
            'id': f'bk-{len(added) + 1:04d}',
            'date': d.isoformat(),
            'category': cat,
            'type': 'expense',
            'amount': round(t['amount'], 2),
            'description': f'{vendor} — {p[:70]}',
        })
    return added, excluded


def main():
    credits, debits = load_bank_rows()
    data = json.loads(JSON_PATH.read_text(encoding='utf-8'))

    # Idempotency: strip previous bank-generated rows and backfilled invoices
    data['expenses'] = [e for e in data.get('expenses', []) if not str(e.get('id', '')).startswith('bk-')]
    data['invoices'] = [i for i in data.get('invoices', [])
                        if not re.match(r'^(PRO|PEA)-\d{2}$', str(i.get('id', '')))]

    payments, report, used_credit_idx = match_invoices(data['invoices'], credits)
    apply_manual_matches(data['invoices'], credits, used_credit_idx, payments, report)
    apply_owner_confirmed(data['invoices'], payments, report)
    backfill_preledger_invoices(data, credits, used_credit_idx, payments, report)

    # Unmatched credits -> other income (exclude self/partner + capital inflows)
    other_income, skipped_credits, capital_credits = [], [], []
    for i, c in enumerate(credits):
        if i in used_credit_idx:
            continue
        if SELF_NAMES.search(c['particulars']):
            skipped_credits.append((c['date'].isoformat(), c['amount'], 'self/partner inflow', c['particulars'][:50]))
            continue
        if CAPITAL_IN.search(c['particulars']):
            capital_credits.append((c['date'].isoformat(), c['amount'], 'capital/personal inflow — excluded', c['particulars'][:50]))
            continue
        other_income.append(c)
        payments.append({
            'id': f'pay-bank-{len(payments) + 1:03d}',
            'payment_date': c['date'].isoformat(),
            'amount': c['amount'],
            'amount_inr': c['amount'],
            'payment_method': 'Bank Transfer',
            'reference_number': ('Unmatched receipt — ' + c['particulars'])[:80],
        })

    bank_exp, excluded_debits = import_bank_expenses(debits, data['expenses'])
    data['expenses'].extend(bank_exp)
    data['payments'] = payments
    JSON_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

    # ---------- report ----------
    print(f'Bank rows: {len(credits)} credits, {len(debits)} debits')
    print(f'\n== INR exact matches ({len(report["inr"])}) ==')
    for r in report['inr']:
        print(f'  {r[0]:<10} {r[1]:<30} ₹{r[3]:>12,.0f}  {r[4]}  {r[6]}')
    print(f'\n== FX conversions ({len(report["fx"])}) ==')
    for r in report['fx']:
        print(f'  {r[0]:<10} {r[1]:<30} ${r[2]:>10,.2f} -> ₹{r[3]:>10,.0f} @{r[5]:<8} {r[4]}')
    print(f'\n== TDS-deducted matches ({len(report["tds"])}) ==')
    for r in report['tds']:
        print(f'  {r[0]:<10} ₹{r[2]:>10,.0f} -> ₹{r[3]:>10,.0f} (TDS ₹{r[2]-r[3]:,.0f})  {r[4]}')
    resolved_later = set(MANUAL_CREDIT_MATCH) | set(OWNER_CONFIRMED_PAID)
    unpaid_final = [r for r in report['unpaid'] if r[0].strip() not in resolved_later]
    print(f'\n== Still unpaid ({len(unpaid_final)}) ==')
    for r in unpaid_final:
        print(f'  {r[0]:<10} {r[1]}  {r[2]:>12,.2f}  {r[3]}')
    if report.get('owner_confirmed'):
        print(f'\n== Owner-confirmed paid, no bank receipt ({len(report["owner_confirmed"])}) ==')
        for r in report['owner_confirmed']:
            print(f'  {r[0]:<10} {r[1]:>10,.2f} -> ₹{r[2]:>10,.0f}  {r[3]}  {r[4]}')
    if report.get('manual_missing'):
        print(f'\n!! Manual matches NOT found: {report["manual_missing"]}')
    print(f'\n== Backfilled pre-Oct-2024 invoices ({len(report.get("backfilled", []))}) ==')
    for r in report.get('backfilled', []):
        print(f'  {r[0]:<8} {r[1]:<30} ₹{r[2]:>12,.2f}  {r[3]}  {r[4]}')
    print(f'\n== Other income credits ({len(other_income)}), total ₹{sum(c["amount"] for c in other_income):,.0f} ==')
    for c in sorted(other_income, key=lambda x: x['date']):
        print(f'  {c["date"].isoformat()}  ₹{c["amount"]:>12,.2f}  {c["particulars"][:60]}')
    print(f'\n== Skipped self/partner credits ({len(skipped_credits)}), total ₹{sum(r[1] for r in skipped_credits):,.0f} ==')
    for r in skipped_credits:
        print(f'  {r[0]}  ₹{r[1]:>12,.2f}  {r[3]}')
    print(f'\n== Capital/personal inflows excluded ({len(capital_credits)}), total ₹{sum(r[1] for r in capital_credits):,.0f} ==')
    for r in capital_credits:
        print(f'  {r[0]}  ₹{r[1]:>12,.2f}  {r[3]}')
    from collections import Counter
    cat_tot = Counter()
    for e in bank_exp:
        cat_tot[e['category']] += e['amount']
    print(f'\n== Bank expenses added: {len(bank_exp)}, total ₹{sum(cat_tot.values()):,.0f} ==')
    for k, v in cat_tot.most_common():
        print(f'  {k:<28} ₹{v:>12,.0f}')
    general = [e for e in bank_exp if e['category'] == 'General']
    print(f'\n== General-category expenses ({len(general)}) — review ==')
    for e in sorted(general, key=lambda x: -x['amount'])[:25]:
        print(f'  {e["date"]}  ₹{e["amount"]:>12,.2f}  {e["description"][:65]}')
    print(f'\n== Excluded debits ({len(excluded_debits)}) ==')
    for r in excluded_debits:
        print(f'  {r[0]}  ₹{r[1]:>12,.2f}  {r[2]:<28} {r[3]}')


if __name__ == '__main__':
    main()
