import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <h1 className="text-6xl font-black text-money-gold font-serif">404</h1>
      <p className="text-text-secondary">Page not found</p>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-money-gold border border-money-gold/20 hover:border-money-gold/40 transition-colors"
      >
        <Home size={16} /> Back to Dashboard
      </Link>
    </div>
  );
}
