/**
 * Convert a number to words (Indian English format for banking forms).
 * E.g. 2610 -> "Two thousand six hundred and ten"
 * E.g. 5000 -> "Five thousand"
 * Supports up to millions.
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToWords(-num);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    if (n < 1000) {
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    }
    if (n < 100000) {
      // Indian system: Thousand, then Lakhs
      const thousands = Math.floor(n / 1000);
      const rem = n % 1000;
      return convert(thousands) + ' Thousand' + (rem ? ' ' + convert(rem) : '');
    }
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      const rem = n % 100000;
      return convert(lakhs) + ' Lakh' + (rem ? ' ' + convert(rem) : '');
    }
    const crores = Math.floor(n / 10000000);
    const rem = n % 10000000;
    return convert(crores) + ' Crore' + (rem ? ' ' + convert(rem) : '');
  }

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);
  let result = convert(whole);
  if (decimal > 0) {
    result += ` and ${decimal}/100`;
  }
  return result;
}
