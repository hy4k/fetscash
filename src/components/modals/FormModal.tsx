import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div
        className={cn(
          'glass-panel rounded-2xl border border-divider w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <h3 className="text-lg font-semibold text-money-paper">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.02] text-text-tertiary hover:text-text-secondary transition-colors flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
