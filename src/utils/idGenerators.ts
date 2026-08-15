export function generateNextId(prefix: string, items: { custom_id?: string; paid_by?: string }[]): string {
  const maxNum = items.reduce((max, item) => {
    const idStr = item.custom_id || item.paid_by;
    if (idStr && idStr.startsWith(prefix)) {
      const numStr = idStr.replace(prefix, '');
      const num = parseInt(numStr, 10);
      return !isNaN(num) && num > max ? num : max;
    }
    return max;
  }, 0);
  const nextNum = maxNum + 1;
  return `${prefix}${nextNum.toString().padStart(2, '0')}`;
}
