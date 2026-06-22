import { useAppStore } from '@/stores/useAppStore';

export function useLocationColor() {
  const location = useAppStore((s) => s.location);
  return location === 'cochin' ? '#85bb65' : '#3e5c76';
}
