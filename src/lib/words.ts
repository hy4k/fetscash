/** Amount-in-words for invoice printouts (Indian & international styles). */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  const parts: string[] = []
  if (h) parts.push(`${ONES[h]} Hundred`)
  if (r) parts.push(twoDigits(r))
  return parts.join(' ')
}

/** International scale: thousand / million / billion (used for USD, matches existing invoices). */
export function intlWords(n: number): string {
  if (n === 0) return 'Zero'
  const scales: [number, string][] = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ]
  const parts: string[] = []
  let rem = n
  for (const [v, label] of scales) {
    if (rem >= v) {
      parts.push(`${threeDigits(Math.floor(rem / v))} ${label}`)
      rem %= v
    }
  }
  if (rem) parts.push(threeDigits(rem))
  return parts.join(' ')
}

/** Indian scale: thousand / lakh / crore (used for INR). */
export function indianWords(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  let rem = n
  if (rem >= 10_000_000) {
    parts.push(`${indianWords(Math.floor(rem / 10_000_000))} Crore`)
    rem %= 10_000_000
  }
  if (rem >= 100_000) {
    parts.push(`${twoDigits(Math.floor(rem / 100_000))} Lakh`)
    rem %= 100_000
  }
  if (rem >= 1_000) {
    parts.push(`${twoDigits(Math.floor(rem / 1_000))} Thousand`)
    rem %= 1_000
  }
  if (rem) parts.push(threeDigits(rem))
  return parts.join(' ')
}

/**
 * "Two Thousand Five Hundred Sixty Nine Dollar and Ninety Cent Only" (USD)
 * "Rupees One Lakh Twenty Five Thousand and Zero Paisa Only"-style (INR)
 */
export function amountInWords(amount: number, currency: 'INR' | 'USD'): string {
  const rounded = Math.round(amount * 100)
  const whole = Math.floor(rounded / 100)
  const frac = rounded % 100
  if (currency === 'USD') {
    const base = `${intlWords(whole)} Dollar${whole === 1 ? '' : ''}`
    return frac ? `${base} and ${intlWords(frac)} Cent Only` : `${base} Only`
  }
  const base = `Rupees ${indianWords(whole)}`
  return frac ? `${base} and ${indianWords(frac)} Paise Only` : `${base} Only`
}
