import * as XLSX from 'xlsx'

export interface StatementRow {
  date: string // ISO yyyy-mm-dd
  description: string
  kind: 'income' | 'expense'
  amount: number
  reference?: string
}

const DATE_RE = /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/
const AMT_RE = /[\d,]+\.\d{2}/g

function toISO(d: string, m: string, y: string) {
  return `${y}-${m}-${d}`
}

function parseAmount(s: unknown): number {
  if (typeof s === 'number') return s
  if (typeof s !== 'string') return 0
  const n = parseFloat(s.replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? Math.abs(n) : 0
}

/** Excel / CSV via SheetJS — finds the header row, then maps Date / Narration / Debit / Credit. */
function parseExcelRows(matrix: unknown[][]): StatementRow[] {
  let header = -1
  let colDate = -1, colDesc = -1, colDebit = -1, colCredit = -1, colRef = -1
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const cells = (matrix[i] ?? []).map((c) => String(c ?? '').toLowerCase())
    const d = cells.findIndex((c) => c.includes('date'))
    const dr = cells.findIndex((c) => /debit|withdrawal|\bdr\b/.test(c))
    const cr = cells.findIndex((c) => /credit|deposit|\bcr\b/.test(c))
    if (d >= 0 && (dr >= 0 || cr >= 0)) {
      header = i
      colDate = d
      colDebit = dr
      colCredit = cr
      colDesc = cells.findIndex((c) => /particular|narrat|descrip|remark|detail/.test(c))
      colRef = cells.findIndex((c) => /ref|chq|cheque|utr/.test(c))
      break
    }
  }
  if (header < 0) return []

  const out: StatementRow[] = []
  for (let i = header + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? []
    const rawDate = row[colDate]
    let date: string | null = null
    if (typeof rawDate === 'number') {
      // Excel serial
      const d = XLSX.SSF.parse_date_code(rawDate)
      if (d) date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    } else {
      const m = DATE_RE.exec(String(rawDate ?? ''))
      if (m) date = toISO(m[1], m[2], m[3])
    }
    if (!date) continue
    const debit = colDebit >= 0 ? parseAmount(row[colDebit]) : 0
    const credit = colCredit >= 0 ? parseAmount(row[colCredit]) : 0
    if (debit <= 0 && credit <= 0) continue
    const desc = colDesc >= 0 ? String(row[colDesc] ?? '').trim() : ''
    const ref = colRef >= 0 ? String(row[colRef] ?? '').trim() : undefined
    out.push({
      date,
      description: desc || 'Bank transaction',
      kind: credit > 0 ? 'income' : 'expense',
      amount: credit > 0 ? credit : debit,
      reference: ref || undefined,
    })
  }
  return out
}

/** PDF bank statement — extract text lines, split columns, classify by running balance. */
async function parsePdf(file: File): Promise<StatementRow[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise

  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    const byY = new Map<number, { x: number; s: string }[]>()
    for (const item of tc.items as { str: string; transform: number[] }[]) {
      const y = Math.round(item.transform[5])
      const arr = byY.get(y) ?? []
      arr.push({ x: item.transform[4], s: item.str })
      byY.set(y, arr)
    }
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const line = byY.get(y)!.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim()
      if (line) lines.push(line)
    }
  }

  const out: StatementRow[] = []
  let prevBalance: number | null = null
  for (const line of lines) {
    const dm = DATE_RE.exec(line)
    if (!dm) continue
    const amounts = (line.match(AMT_RE) ?? []).map(parseAmount).filter((n) => n > 0)
    if (amounts.length < 2) continue
    const date = toISO(dm[1], dm[2], dm[3])
    const balance = amounts[amounts.length - 1]
    const txnAmount = amounts.length >= 3 ? amounts[amounts.length - 2] : amounts[0]
    let kind: 'income' | 'expense' | null = null
    if (prevBalance != null) kind = balance > prevBalance ? 'income' : balance < prevBalance ? 'expense' : null
    prevBalance = balance
    const description = line
      .replace(dm[0], '')
      .replace(AMT_RE, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Bank transaction'
    if (kind && txnAmount > 0) out.push({ date, description, kind, amount: txnAmount })
  }
  return out
}

export async function parseStatement(file: File): Promise<StatementRow[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return parsePdf(file)
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
  return parseExcelRows(matrix)
}

/** Keyword-based category guess for a narration. */
export function guessCategory(description: string, categories: string[]): string {
  const d = description.toLowerCase()
  const match = (re: RegExp) => categories.find((c) => re.test(c.toLowerCase()))
  if (/rent|mariyam/.test(d)) return match(/rent/) ?? 'Misc'
  if (/salary|staff|wage/.test(d)) return match(/salar/) ?? 'Misc'
  if (/gst|tax/.test(d)) return match(/gst|tax/) ?? 'Misc'
  if (/electric|water|wifi|internet|broadband|kseb/.test(d)) return match(/utilit/) ?? 'Misc'
  if (/travel|fuel|petrol|uber|ola/.test(d)) return match(/travel/) ?? 'Misc'
  if (/courier|dtdc|post/.test(d)) return match(/courier/) ?? 'Misc'
  return 'Misc'
}
