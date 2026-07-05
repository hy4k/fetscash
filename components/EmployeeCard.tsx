import type { Employee } from '../types';

interface EmployeeCardProps {
  employee: Employee;
  onSelect: (employee: Employee) => void;
}

function cardTypeGradient(cardType: string): string {
  switch (cardType) {
    case 'FETS Premier':
      return 'linear-gradient(135deg, #2e2514 0%, #4a3f1a 40%, #d4af37 100%)';
    case 'FETS Money':
      return 'linear-gradient(135deg, #1a2e1a 0%, #2a4a2a 40%, #85bb65 100%)';
    case 'FETS Card':
      return 'linear-gradient(135deg, #0f1a2e 0%, #1a2a4a 40%, #3e5c76 100%)';
    case 'FETS Currency':
      return 'linear-gradient(135deg, #1a2e2a 0%, #2a4a3a 40%, #2d8a7a 100%)';
    default:
      return 'linear-gradient(135deg, #0f1a14, #15221b)';
  }
}

function cardTypeAccent(cardType: string): string {
  switch (cardType) {
    case 'FETS Premier': return '#d4af37';
    case 'FETS Money': return '#85bb65';
    case 'FETS Card': return '#3e5c76';
    case 'FETS Currency': return '#2d8a7a';
    default: return '#85bb65';
  }
}

export default function EmployeeCard({ employee, onSelect }: EmployeeCardProps) {
  return (
    <div
      onClick={() => onSelect(employee)}
      className="cursor-pointer group"
      style={{ aspectRatio: '1.586' }}
    >
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
        style={{
          background: cardTypeGradient(employee.card_type),
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${cardTypeAccent(employee.card_type)}20`,
        }}
      >
        {/* Glass sheen overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
          }}
        />

        {/* Top: FETS logo and card type */}
        <div className="absolute top-4 left-5 right-5 flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.15)', color: cardTypeAccent(employee.card_type) }}
            >
              F
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/70">FETS</span>
          </div>
          <span
            className="text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)', color: cardTypeAccent(employee.card_type) }}
          >
            {employee.card_type}
          </span>
        </div>

        {/* EMV Chip */}
        <div className="absolute top-14 left-5">
          <div
            className="w-10 h-8 rounded-md relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 50%, #d4af37 100%)' }}
          >
            <div className="absolute inset-0 opacity-30">
              <div className="w-full h-full" style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)' }} />
            </div>
          </div>
        </div>

        {/* Card number */}
        <div className="absolute top-28 left-5 right-5">
          <p className="font-mono text-lg tracking-[0.15em] text-white/90">
            {employee.card_number}
          </p>
        </div>

        {/* Card holder */}
        <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/50 mb-1">Card Holder</p>
            <p className="text-sm font-semibold text-white tracking-wide truncate max-w-[200px]">
              {employee.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/50 mb-1">Location</p>
            <p className="text-xs font-medium text-white/80">{employee.location || '—'}</p>
          </div>
        </div>

        {/* Hover glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${cardTypeAccent(employee.card_type)}15, transparent 60%)`,
          }}
        />
      </div>
    </div>
  );
}
