import { create } from 'zustand';
import { LocationType } from '@/types';

interface AppState {
  location: LocationType;
  setLocation: (location: LocationType) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  modalData: Record<string, any> | null;
  openModal: (modal: string, data?: Record<string, any>) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  location: 'cochin',
  setLocation: (location) => set({ location }),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  activeModal: null,
  modalData: null,
  openModal: (modal, data) => set({ activeModal: modal, modalData: data || null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
