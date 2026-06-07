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
      className="glass-panel p-5 sm:p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-400"
      style={{ animation: `slideUp 0.5s ease-out ${delay}s backwards` }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-inner"
          style={{
            background: `${color}10`,
            border: `1px solid ${color}20`,
            color: color,
          }}
        >
          <i className={`fas ${icon}`}></i>
        </div>
        {trend && (
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${trendUp ? 'bg-money-green/8 border-money-green/20 text-money-green' : 'bg-red-500/8 border-red-500/20 text-red-400'}`}>
            {trendUp ? '+' : ''}{trend}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-text-tertiary text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5">{title}</p>
        <h3 className="text-2xl sm:text-[28px] font-extrabold text-money-paper tracking-tight font-sans">{value}</h3>
      </div>

      {/* Ambient glow */}
      <div
        className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full blur-[70px] opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none"
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );
};
