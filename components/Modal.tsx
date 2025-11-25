import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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
      {/* Backdrop with texture */}
      <div 
        className={`absolute inset-0 bg-[#000]/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      ></div>
      
      {/* Content */}
      <div 
        className={`bg-[#16231d] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[#85bb65]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 transform transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full sm:translate-y-8 opacity-0 scale-95'}`}
        style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/black-scales.png")`, backgroundBlendMode: 'overlay' }}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#85bb65]/10">
          <h3 className="text-xl font-black text-money-gold tracking-widest uppercase font-serif" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{title}</h3>
          <button 
            onClick={onClose} 
            className="neo-btn h-10 w-10 rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
            {children}
        </div>
      </div>
    </div>
  );
};