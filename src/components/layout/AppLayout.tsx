import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/stores/useAppStore';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-money-paper">
      <Sidebar />
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'sm:ml-72' : 'sm:ml-20'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
