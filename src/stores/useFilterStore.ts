import { create } from 'zustand';

interface FilterState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  categoryFilter: 'all',
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  dateRange: { start: '', end: '' },
  setDateRange: (dateRange) => set({ dateRange }),
  resetFilters: () => set({ searchQuery: '', categoryFilter: 'all', dateRange: { start: '', end: '' } }),
}));
