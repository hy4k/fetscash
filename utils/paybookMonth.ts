export const PAYBOOK_ALL_PERIODS = '__all__';

const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function canonicalMonthFromDate(d = new Date()): string {
  return `${ABBR[d.getMonth()]}-${d.getFullYear()}`;
}

const LONG_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

export function normalizeMonthToCanonical(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  const short = /^([A-Za-z]{3})-(\d{4})$/.exec(v);
  if (short) {
    const idx = ABBR.findIndex((x) => x.toLowerCase() === short[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${ABBR[idx]}-${short[2]}`;
  }
  const longForm = /^([A-Za-z]+)\s+(\d{4})$/.exec(v);
  if (longForm) {
    const idx = LONG_NAMES.indexOf(longForm[1].toLowerCase() as (typeof LONG_NAMES)[number]);
    if (idx >= 0) return `${ABBR[idx]}-${longForm[2]}`;
  }
  return null;
}

export function prettyPeriodLabel(value: string): string {
  if (value === PAYBOOK_ALL_PERIODS) return 'All periods';
  const c = normalizeMonthToCanonical(value) ?? value;
  const m = /^([A-Za-z]{3})-(\d{4})$/.exec(c);
  if (!m) return value;
  const idx = ABBR.findIndex((x) => x === m[1]);
  if (idx < 0) return c.replace('-', ' ');
  const d = new Date(parseInt(m[2], 10), idx, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function rollingCanonicalMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${ABBR[x.getMonth()]}-${x.getFullYear()}`);
  }
  return out;
}

function sortKey(canonical: string): number {
  const m = /^([A-Za-z]{3})-(\d{4})$/.exec(canonical);
  if (!m) return 0;
  const yi = parseInt(m[2], 10);
  const idx = ABBR.findIndex((x) => x === m[1]);
  return yi * 12 + (idx >= 0 ? idx : 0);
}

export function sortPeriodsDesc(months: string[]): string[] {
  const uniq = Array.from(new Set(months.filter(Boolean)));
  return uniq.sort((a, b) => {
    const ca = normalizeMonthToCanonical(a) ?? a;
    const cb = normalizeMonthToCanonical(b) ?? b;
    return sortKey(cb) - sortKey(ca);
  });
}

export function monthEqVariants(ledgerMonth: string): string[] {
  if (ledgerMonth === PAYBOOK_ALL_PERIODS) return [];
  const m = ledgerMonth.trim();
  if (!m) return [m];
  const out = new Set<string>([m]);
  const can = normalizeMonthToCanonical(m);
  if (can) out.add(can);
  return Array.from(out);
}
