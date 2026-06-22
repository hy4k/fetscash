export function formatCurrency(value: number, currency: string = 'INR'): string {
  if (currency === 'INR') return `₹${value.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${value.toLocaleString('en-US')}`;
  return `${value.toLocaleString()}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleString('default', { month: 'short' });
}
