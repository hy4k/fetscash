import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  color: string;
  delay?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendUp, color, delay = 0 }) => {
  return (
    <div 
        className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500"
        style={{ animation: `fadeIn 0.5s ease-out ${delay}s backwards` }}
    >
      {/* Decorative Border Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div 
            className="w-12 h-12 rounded-xl neo-btn flex items-center justify-center text-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
            style={{ color: color }}
        >
            <i className={`fas ${icon}`}></i>
        </div>
        {trend && (
            <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-inner ${trendUp ? 'bg-money-green/10 border-money-green/30 text-money-green' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                {trendUp ? '+' : ''}{trend}
            </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-black text-money-paper tracking-tight font-serif drop-shadow-md">{value}</h3>
      </div>
      
      {/* Background glow effect */}
      <div 
        className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none mix-blend-screen"
        style={{ backgroundColor: color }}
      ></div>
      
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-overlay pointer-events-none"></div>
    </div>
  );
};