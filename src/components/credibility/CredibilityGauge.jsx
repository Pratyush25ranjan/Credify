import { cn } from '@/lib/utils';

export default function CredibilityGauge({ score }) {
  const getColor = () => {
    if (score >= 75) return { ring: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Trusted', labelColor: 'text-emerald-700' };
    if (score >= 50) return { ring: 'text-amber-500', bg: 'bg-amber-50', label: 'Moderate', labelColor: 'text-amber-700' };
    return { ring: 'text-red-500', bg: 'bg-red-50', label: 'Unreliable', labelColor: 'text-red-700' };
  };

  const config = getColor();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center p-8 rounded-2xl", config.bg)}>
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8"
            className={config.ring}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-display font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={cn("mt-4 text-sm font-semibold uppercase tracking-wider", config.labelColor)}>
        {config.label}
      </span>
    </div>
  );
}