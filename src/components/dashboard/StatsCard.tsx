import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export function StatsCard({ title, value, icon: Icon, color, delay = 0 }: StatsCardProps) {
  return (
    <div 
      className="glass-panel rounded-2xl p-5 border border-divider flex items-center gap-4 hover:border-money-gold/20 transition-all duration-300"
      style={{ animationDelay: `${delay}s` }}
    >
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" 
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">{title}</p>
        <p className="text-xl font-extrabold text-money-paper font-sans tracking-tight">{value}</p>
      </div>
    </div>
  );
}
