import { useQuery } from '@tanstack/react-query';
import { paybookApi } from '@/services';
import { useAppStore } from '@/stores/useAppStore';

export function usePaybookSalary() {
  const location = useAppStore((s) => s.location);
  return useQuery({
    queryKey: ['paybookSalary', location],
    queryFn: () => paybookApi.fetchSalaryData(location),
  });
}

export function usePaybookExpenses() {
  const location = useAppStore((s) => s.location);
  return useQuery({
    queryKey: ['paybookExpenses', location],
    queryFn: () => paybookApi.fetchExpensesData(location),
  });
}
