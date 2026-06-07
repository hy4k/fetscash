import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Wider panel for complex forms (e.g. payroll ledger) */
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-lg' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-[#000]/70 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Modal panel */}
      <div
        className={`bg-surface w-full ${maxWidthClass} rounded-t-2xl sm:rounded-2xl border border-divider shadow-[0_0_60px_rgba(0,0,0,0.6)] relative z-10 transform transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full sm:translate-y-6 opacity-0 scale-[0.97]'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-divider bg-surface-highlight/40">
          <h3 className="text-lg font-black text-money-gold tracking-wider uppercase font-serif" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-tertiary hover:text-red-400 hover:bg-red-500/5 transition-all border border-transparent hover:border-red-500/20"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
